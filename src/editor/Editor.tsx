// /* eslint-disable func-names */
import { useState, useRef, useEffect, FC } from 'react'
import './editor.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPause, faPlay, faSync, faStepBackward, faStepForward, faCamera, faDownload, faEraser, faGripLinesVertical } from '@fortawesome/free-solid-svg-icons'

import { fetchFile, FFmpeg } from '@ffmpeg/ffmpeg'
import { Box } from '@mui/material'
import { Timeline } from '../timeline/Timeline'
import { forceDownload } from './utilis'
import { ErrorBoundary } from '../ErrorBoundary'

interface Timing { 'start': number, 'end': number }


const Editor: FC<{ videoUrl: string, ffmpeg: FFmpeg }> = ({ videoUrl, ffmpeg }) => {

    //Boolean state to handle video mute
    const [isMuted, setIsMuted] = useState(false)

    //Boolean state to handle whether video is playing or not
    const [playing, setPlaying] = useState(false)

    //Float integer state to help with trimming duration logic
    const [difference, setDifference] = useState(0.2)

    //State for imageUrl
    const [imageUrl, setImageUrl] = useState('')

    //Integer state to blue progress bar as video plays
    const [seekerBar, setSeekerBar] = useState(0)

    //Stateful array handling storage of the start and end times of videos
    const [timings, setTimings] = useState<Timing[]>([])

    const [loaded, setLoaded] = useState(false)
    const [deletingGrabber, setDeletingGrabber] = useState(false)


    //Ref handling metadata needed for trim markers
    const currentlyGrabbedRef = useRef({ 'index': 0, 'type': 'none' })

    //Ref handling the initial video element for trimming
    const playVideoRef = useRef<HTMLVideoElement>() as React.MutableRefObject<HTMLVideoElement>;

    //Ref handling the progress bar element
    const progressBarRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;

    //Integer state to handle the progress bars numerical incremation
    const [progress, setProgress] = useState(0)

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {

        window.addEventListener('keyup', (event) => {
            if (event.key === ' ') {
                playPause()
            }
        })
    })

    const onloadedmetadata = () => {
        setLoaded(true)
        console.log("metadata loaded", playVideoRef.current?.duration)
        //Handles the start and end metadata for the timings state
        const time = [{ 'start': 0, 'end': playVideoRef.current?.duration! }]
        setTimings([...timings, ...time])
    }

    const reset = () => {
        if (playVideoRef.current && progressBarRef.current) {

            playVideoRef.current?.pause()

            setIsMuted(false)
            setPlaying(false)
            currentlyGrabbedRef.current = { 'index': 0, 'type': 'none' }
            setImageUrl('')

            setTimings([{ 'start': 0, 'end': playVideoRef.current.duration }])
            playVideoRef.current.currentTime = timings[0].start
            progressBarRef.current.style.left = `${timings[0].start / playVideoRef.current.duration * 100}%`
            progressBarRef.current.style.width = '0%'
        }
    }

    const captureSnapshot = () => {
        let video = playVideoRef.current!
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataURL = canvas.toDataURL()
        setImageUrl(dataURL)
    }

    const downloadSnapshot = () => {
        let a = document.createElement('a')
        a.href = imageUrl
        a.download = 'Thumbnail.png'
        a.click()
    }

    const skipPrevious = () => {
        if (playing) {
            playVideoRef.current?.pause()
        }
    }

    const playPause = () => {
        if (!timings[0]) {
            onloadedmetadata()
        }
        if (playing) {
            playVideoRef.current?.pause()
        }
        else {
            if ((playVideoRef.current && playVideoRef.current.currentTime >= timings[0].end)) {
                playVideoRef.current.pause()
                setPlaying(false)
                currentlyGrabbedRef.current = { 'index': 0, 'type': 'start' }
                playVideoRef.current.currentTime = timings[0].start
                if (progressBarRef.current) {
                    progressBarRef.current.style.left = `${timings[0].start / playVideoRef.current.duration * 100}%`
                    progressBarRef.current.style.width = '0%'
                }

            }
            playVideoRef.current?.play()
        }
        setPlaying(!playing)
    }

    const skipNext = () => {
        if (playing) {
            playVideoRef.current?.pause()
        }
    }

    //Function handling adding new trim markers logic
    const addGrabber = () => {
        const time = timings
        const end = time[time.length - 1].end + difference
        if (end >= playVideoRef.current.duration) {
            return
        }
        time.push({ 'start': end + 0.2, 'end': playVideoRef.current.duration })
        setTimings([...timings, ...time])
    }

    const saveVideo = async () => {
        let metadata = {
            'trim_times': timings,
            'mute': isMuted
        }
        console.log(metadata.trim_times)
        const trimStart = metadata.trim_times[0].start
        const trimEnd = metadata.trim_times[0].end

        const trimmedVideo = trimEnd - trimStart

        console.log('Trimmed Duration: ', trimmedVideo)
        console.log('Trim End: ', trimEnd)

        try {
            ffmpeg.FS('writeFile', 'myFile.mp4', await fetchFile(videoUrl))

            ffmpeg.setProgress(({ ratio }) => {
                console.log('ffmpeg progress: ', ratio)
                if (ratio < 0) {
                    setProgress(0)
                }
                setProgress(Math.round(ratio * 100))
            })

            await ffmpeg.run('-ss', `${trimStart}`, '-accurate_seek', '-i', 'myFile.mp4', '-to', `${trimmedVideo}`, '-codec', 'copy', 'output.mp4')

            const data = ffmpeg.FS('readFile', 'output.mp4')

            const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }))
            forceDownload(url);
        }
        catch (error) {
            console.log(error)
        }
    }

    return (
        <Box component="span" sx={{ p: 2, width: '100%' }}>
            <video className='video'
                muted={isMuted}
                ref={playVideoRef}
                onLoadedMetadata={onloadedmetadata}
                onLoadedData={() => {
                    console.log(playVideoRef)
                }}
                onClick={() => {
                    playPause()
                }}
                onTimeUpdate={(event) => {
                    setSeekerBar(event.currentTarget.currentTime)
                }}
            >
                <source src={videoUrl} type='video/mp4' />
            </video>
            {loaded && (
                <ErrorBoundary>
                    <Timeline timings={timings} seekerBar={seekerBar} playVideoRef={playVideoRef} deletingGrabber={deletingGrabber} setTimings={setTimings} />
                </ErrorBoundary>
            )}

            <div className='controls'>
                <div className='player-controls'>
                    <button className='settings-control' title='Reset Video' onClick={reset}><FontAwesomeIcon icon={faSync} /></button>
                    <button className='settings-control' title='Capture Thumbnail' onClick={captureSnapshot}><FontAwesomeIcon icon={faCamera} /></button>
                </div>
                <div className='player-controls'>
                    <button className='seek-start' title='Skip to previous clip' onClick={skipPrevious}><FontAwesomeIcon icon={faStepBackward} /></button>
                    <button className='play-control' title='Play/Pause' onClick={playPause} >{playing ? <FontAwesomeIcon icon={faPause} /> : <FontAwesomeIcon icon={faPlay} />}</button>
                    <button className='seek-end' title='Skip to next clip' onClick={skipNext}><FontAwesomeIcon icon={faStepForward} /></button>
                </div>
                <div>
                    <button title='Delete grabber' className='trim-control margined' onClick={() => setDeletingGrabber(true)}>Delete <FontAwesomeIcon icon={faGripLinesVertical} /></button>
                    <button title='Add grabber' className='trim-control margined' onClick={addGrabber}>Add <FontAwesomeIcon icon={faGripLinesVertical} /></button>
                    <button title='Save changes' className='trim-control' onClick={saveVideo}>Save</button>
                </div>
            </div>
            {(imageUrl !== '') ?
                <div className={'marginVertical'}>
                    <img src={imageUrl} className={'thumbnail'} alt='Photos' />
                    <div className='controls'>
                        <div className='player-controls'>
                            <button className='settings-control' title='Reset Video' onClick={downloadSnapshot}><FontAwesomeIcon icon={faDownload} /></button>
                            <button className='settings-control' title='Save Video' onClick={() => {
                                setImageUrl('')
                            }}><FontAwesomeIcon icon={faEraser} /></button>
                        </div>
                    </div>
                </div>
                : ''}
        </Box>
    )
}

export default Editor