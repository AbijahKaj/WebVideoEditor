// /* eslint-disable func-names */
import { useState, useRef, useEffect, FC } from 'react'
import './editor.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPause, faPlay, faSync, faStepBackward, faStepForward, faCamera, faDownload, faEraser } from '@fortawesome/free-solid-svg-icons'

import { fetchFile, FFmpeg } from '@ffmpeg/ffmpeg'

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


    //Ref handling metadata needed for trim markers
    const currentlyGrabbedRef = useRef({ 'index': 0, 'type': 'none' })

    //Ref handling the initial video element for trimming
    const playVideoRef = useRef<HTMLVideoElement>() as React.MutableRefObject<HTMLVideoElement>;

    //Ref handling the progress bar element
    const progressBarRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;

    //Ref handling the element of the current play time
    const playBackBarRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;

    //Integer state to handle the progress bars numerical incremation
    const [progress, setProgress] = useState(0)

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (progressBarRef.current && playVideoRef?.current?.onloadedmetadata) {
            const currentIndex = currentlyGrabbedRef.current.index
            const seek = (playVideoRef?.current?.currentTime - timings[0].start) / playVideoRef.current.duration * 100
            setSeekerBar(seek)
            progressBarRef.current.style.width = `${seekerBar}%`
            if ((playVideoRef.current.currentTime >= timings[0].end)) {
                playVideoRef.current.pause()
                setPlaying(false)
                currentlyGrabbedRef.current = ({ 'index': currentIndex + 1, 'type': 'start' })
                progressBarRef.current.style.width = '0%'
                progressBarRef.current.style.left = `${timings[0].start / playVideoRef.current.duration * 100}%`
                playVideoRef.current.currentTime = timings[0].start
            }
            playVideoRef.current.onloadedmetadata = onloadedmetadata
        }

        window.addEventListener('keyup', (event) => {
            if (event.key === ' ') {
                playPause()
            }
        })
    })

    const onloadedmetadata = () => {
        //Handles the start and end metadata for the timings state
        const time = timings
        if (time.length === 0) {
            time.push({ 'start': 0, 'end': playVideoRef.current?.duration! })
            setTimings(time)
            addActiveSegments()
        }
        else {
            addActiveSegments()
        }
    }

    useEffect(() => {
        return () => {
            window.removeEventListener('mouseup', handleMouseMoveWhenGrabbed)
            window.removeEventListener('pointerup', handleMouseMoveWhenGrabbed)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleMouseMoveWhenGrabbed = (event: { clientX: number }) => {
        if (progressBarRef.current && playBackBarRef.current && playVideoRef.current) {
            playVideoRef.current?.pause()
            addActiveSegments()
            let playbackRect = playBackBarRef.current.getBoundingClientRect()
            let seekRatio = (event.clientX - playbackRect.left) / playbackRect.width
            const index = currentlyGrabbedRef.current.index
            const type = currentlyGrabbedRef.current.type
            let time = timings
            let seek = playVideoRef.current.duration * seekRatio
            if ((type === 'start') && (seek > ((index !== 0) ? (time[index - 1].end + difference + 0.2) : 0)) && seek < time[index].end - difference) {
                progressBarRef.current.style.left = `${seekRatio * 100}%`
                playVideoRef.current.currentTime = seek
                time[index]['start'] = seek
                setPlaying(false)
                setTimings(time)
            }
            else if ((type === 'end') && (seek > time[index].start + difference) && (seek < (index !== (timings.length - 1) ? time[index].start - difference - 0.2 : playVideoRef.current.duration))) {
                progressBarRef.current.style.left = `${time[index].start / playVideoRef.current.duration * 100}%`
                playVideoRef.current.currentTime = time[index].start
                time[index]['end'] = seek
                setPlaying(false)
                setTimings(time)
            }
            progressBarRef.current.style.width = '0%'
        }

    }

    const removeMouseMoveEventListener = () => {
        window.removeEventListener('mousemove', handleMouseMoveWhenGrabbed)
    }

    const removePointerMoveEventListener = () => {
        window.removeEventListener('pointermove', handleMouseMoveWhenGrabbed)
    }

    const reset = () => {
        if (playVideoRef.current && progressBarRef.current) {

            playVideoRef.current?.pause()

            setIsMuted(false)
            setPlaying(false)
            currentlyGrabbedRef.current = { 'index': 0, 'type': 'none' }
            setDifference(0.2)
            setImageUrl('')

            setTimings([{ 'start': 0, 'end': playVideoRef.current.duration }])
            playVideoRef.current.currentTime = timings[0].start
            progressBarRef.current.style.left = `${timings[0].start / playVideoRef.current.duration * 100}%`
            progressBarRef.current.style.width = '0%'
            addActiveSegments()
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

    const updateProgress = (event: { clientX: number }) => {
        if (progressBarRef.current && playBackBarRef.current && playVideoRef.current) {
            let playbackRect = playBackBarRef.current?.getBoundingClientRect()
            let seekTime = ((event.clientX - playbackRect?.left!) / playbackRect?.width!) * playVideoRef.current?.duration!
            playVideoRef.current?.pause()
            let index = -1
            let counter = 0
            for (let times of timings) {
                if (seekTime >= times.start && seekTime <= times.end) {
                    index = counter
                }
                counter += 1
            }
            if (index === -1) {
                return
            }
            setPlaying(false)
            currentlyGrabbedRef.current = { 'index': index, 'type': 'start' }
            progressBarRef.current.style.width = '0%'
            progressBarRef.current.style.left = `${timings[index].start / playVideoRef.current.duration * 100}%`
            playVideoRef.current.currentTime = seekTime
        }

    }

    const addActiveSegments = () => {
        if (playVideoRef.current && playBackBarRef.current) {
            let colors = ''
            let counter = 0
            colors += `, rgb(240, 240, 240) 0%, rgb(240, 240, 240) ${timings[0].start / playVideoRef.current.duration * 100}%`
            for (let times of timings) {
                if (counter > 0) {
                    colors += `, rgb(240, 240, 240) ${timings[counter].end / playVideoRef.current.duration * 100}%, rgb(240, 240, 240) ${times.start / playVideoRef.current.duration * 100}%`
                }
                colors += `, #ccc ${times.start / playVideoRef.current.duration * 100}%, #ccc ${times.end / playVideoRef.current.duration * 100}%`
                counter += 1
            }
            colors += `, rgb(240, 240, 240) ${timings[counter - 1].end / playVideoRef.current.duration * 100}%, rgb(240, 240, 240) 100%`
            playBackBarRef.current.style.background = `linear-gradient(to right${colors})`
        }
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

    function forceDownload(href: string) {
        var anchor = document.createElement('a');
        anchor.href = href;
        anchor.download = href;
        document.body.appendChild(anchor);
        anchor.click();
    }

    return (
        <div className='wrapper'>
            <video className='video'
                muted={isMuted}
                ref={playVideoRef}
                onLoadedMetadata={onloadedmetadata}
                onLoadedData={() => {
                    console.log(playVideoRef)
                    playPause()
                }}
                onClick={() => {
                    playPause()
                }}
                onTimeUpdate={() => {
                    progressBarRef.current && setSeekerBar(parseInt(progressBarRef.current.style.width))
                }}
            >
                <source src={videoUrl} type='video/mp4' />
            </video>
            <div className='playback'>
                {playVideoRef.current ?
                    Array.from(timings).map((timing, index) => (
                        <div key={index}
                        >
                            <div key={'grabber_' + index}>
                                <div id='grabberStart' className='grabber start'
                                    style={{ left: `${timings[0].start / playVideoRef.current.duration * 100}%` }}
                                    onMouseDown={(event) => {
                                        currentlyGrabbedRef.current = { 'index': index, 'type': 'start' }
                                        window.addEventListener('mousemove', handleMouseMoveWhenGrabbed)
                                        window.addEventListener('mouseup', removeMouseMoveEventListener)

                                    }}
                                    onPointerDown={() => {
                                        currentlyGrabbedRef.current = { 'index': index, 'type': 'start' }
                                        window.addEventListener('pointermove', handleMouseMoveWhenGrabbed)
                                        window.addEventListener('pointerup', removePointerMoveEventListener)

                                    }}
                                >
                                    <svg version='1.1' xmlns='http://www.w3.org/2000/svg' x='0' y='0' width='10' height='14' viewBox='0 0 10 14' xmlSpace='preserve'>
                                        <path className='st0' d='M1 14L1 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C2 13.6 1.6 14 1 14zM5 14L5 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C6 13.6 5.6 14 5 14zM9 14L9 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C10 13.6 9.6 14 9 14z' />
                                    </svg>
                                </div>
                                {/* Markup and logic for the end trim marker */}
                                <div id='grabberEnd' className='grabber end'
                                    style={{ left: `${timings[0].end / playVideoRef.current.duration * 100}%` }}
                                    onMouseDown={(event) => {
                                        currentlyGrabbedRef.current = { 'index': index, 'type': 'end' }
                                        window.addEventListener('mousemove', handleMouseMoveWhenGrabbed)
                                        window.addEventListener('mouseup', removeMouseMoveEventListener)

                                    }}
                                    onPointerDown={() => {
                                        currentlyGrabbedRef.current = { 'index': index, 'type': 'end' }
                                        window.addEventListener('pointermove', handleMouseMoveWhenGrabbed)
                                        window.addEventListener('pointerup', removePointerMoveEventListener)
                                    }}
                                >
                                    <svg version='1.1' xmlns='http://www.w3.org/2000/svg' x='0' y='0' width='10' height='14' viewBox='0 0 10 14' xmlSpace='preserve'>
                                        <path className='st0' d='M1 14L1 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C2 13.6 1.6 14 1 14zM5 14L5 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C6 13.6 5.6 14 5 14zM9 14L9 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C10 13.6 9.6 14 9 14z' />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    ))
                    : []}
                <div className='seekable' ref={playBackBarRef} onClick={updateProgress}></div>
                <div className='progress' ref={progressBarRef}></div>
            </div>

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
        </div>
    )
}

export default Editor