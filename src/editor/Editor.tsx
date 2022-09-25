import { useState, useRef, useEffect, FC, useCallback } from 'react'
import './editor.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPause, faPlay, faSync, faStepBackward, faStepForward, faCamera, faDownload, faEraser, faGripLinesVertical } from '@fortawesome/free-solid-svg-icons'

import { fetchFile, FFmpeg } from '@ffmpeg/ffmpeg'
import { Alert, AlertTitle, Box, Button } from '@mui/material'
import debounce from 'lodash.debounce';

import { Timeline } from '../timeline/Timeline'
import { forceDownload, isOverlapping } from './utilis'
import { ErrorBoundary } from '../ErrorBoundary'
import { Timing } from '../types'
import { DownloadRounded } from '@mui/icons-material'

const difference = 0.2

const Editor: FC<{ videoUrl: string, ffmpeg: FFmpeg }> = ({ videoUrl, ffmpeg }) => {
    const [isMuted, setIsMuted] = useState(false)
    const [playing, setPlaying] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [imageUrl, setImageUrl] = useState('')
    const [seekerBar, setSeekerBar] = useState(0)
    const [timings, setTimings] = useState<Timing[]>([])
    const [loaded, setLoaded] = useState(false)
    const [deletingGrabber, setDeletingGrabber] = useState(false)

    const currentlyGrabbedRef = useRef({ 'index': 'grabber_0', 'type': 'none' })
    const playVideoRef = useRef<HTMLVideoElement>() as React.MutableRefObject<HTMLVideoElement>;

    const [progress, setProgress] = useState(0)

    useEffect(() => {
        window.addEventListener('keyup', (event) => {
            if (event.key === ' ') {
                playPause()
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playing])

    const onloadedmetadata = () => {
        setLoaded(true)
        playVideoRef.current.dataset.vidSrc = playVideoRef.current.src;
        console.log("metadata loaded", playVideoRef.current?.duration)
        const time: Timing[] = [{ id: 'grabber_' + timings.length, 'start': 0, 'end': playVideoRef.current?.duration! }]
        setTimings([...timings, ...time])
    }

    const reset = () => {
        if (playVideoRef.current) {
            playVideoRef.current?.pause()
            setIsMuted(false)
            setPlaying(false)
            currentlyGrabbedRef.current = { 'index': 'grabber_0', 'type': 'none' }
            setImageUrl('')

            setTimings([{ id: 'grabber_0', 'start': 0, 'end': playVideoRef.current.duration }])
            playVideoRef.current.currentTime = timings[0].start
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
        if (playing && playVideoRef.current) {
            playVideoRef.current?.pause()
            setPlaying(false)
        }
        else if (playVideoRef.current) {
            const index = timings.findIndex(i => i.id === currentlyGrabbedRef.current.index);
            if (playVideoRef.current.currentTime >= timings[index].end) {
                playVideoRef.current.pause()
                setPlaying(false)
                playVideoRef.current.currentTime = timings[index].start
            } else {
                playVideoRef.current?.play()
                setPlaying(true)
            }

        }
    }

    const skipNext = () => {
        if (playing) {
            playVideoRef.current?.pause()
        }
    }

    const addGrabber = () => {
        const time: Timing[] = timings
        const end = time[time.length - 1].end + difference
        if (end > playVideoRef.current.duration) {
            return
        }
        const newGrabber = { id: 'grabber_' + time.length, 'start': end + 0.2, 'end': playVideoRef.current.duration };
        if (!timings.find(i => i.id === 'grabber_' + time.length) && !isOverlapping(timings, newGrabber)) {
            time.push(newGrabber)
            setTimings([...time])
        }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedAddGrabberHandler = useCallback(
        debounce(addGrabber, 300)
        , [timings]);

    const saveVideo = async () => {
        setExporting(true);
        setProgress(0);
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

        const allowMultipleExports = false // Experimental

        try {
            ffmpeg.FS('writeFile', 'myFile.mp4', await fetchFile(videoUrl))

            ffmpeg.setProgress(({ ratio }) => {
                console.log('ffmpeg progress: ', ratio)
                if (ratio < 0) {
                    setProgress(0)
                }
                setProgress(Math.round(ratio * 100))
            })

            if (allowMultipleExports) {
                let command = ['myFile.mp4'],
                    concateFiles = ''
                timings.forEach((timing) => {
                    command = [...command, '-t', `${timing.start}`, `${timing.id}.mp4`, '-ss', `${timing.end - timing.start}`];
                    concateFiles += `file '${timing.id}.mp4'\n`;
                })
                // Create mutiple files
                await ffmpeg.run('-i', ...command)
                //ffmpeg.FS('writeFile', 'timings.txt', concateFiles)
                // Join the files together
                await ffmpeg.run('-f', 'concat', '-i', concateFiles, '-c', 'copy', 'output.mp4')
            } else {
                await ffmpeg.run('-ss', `${trimStart}`, '-accurate_seek', '-i', 'myFile.mp4', '-to', `${trimmedVideo}`, '-codec', 'copy', 'output.mp4')
            }

            const data = ffmpeg.FS('readFile', 'output.mp4')

            const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }))
            forceDownload(url);
            // Free up the memory
            ffmpeg.FS('unlink', 'output.mp4');
        }
        catch (error) {
            console.log(error)
            setExporting(false)
        } finally {
            setProgress(0)
            setExporting(false)
        }
        setExporting(false)
    }

    return (
        <Box component="span" sx={{ p: 2, width: '100%' }}>
            <Box sx={{ alignItems: "space-between", justifyItems: "center", p: 3 }}>
                <video className='video'
                    style={{
                        width: '60vw',
                        height: '40vh'
                    }}
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
            </Box>

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
                    <Button size={'small'} sx={{ marginRight: '5px' }} title='Delete grabber' className='trim-control margined' onClick={() => setDeletingGrabber(true)}>Delete <FontAwesomeIcon icon={faGripLinesVertical} /></Button>
                    <Button size={'small'} sx={{ marginRight: '5px' }} title='Add grabber' className='trim-control margined' onClick={debouncedAddGrabberHandler}>Add <FontAwesomeIcon icon={faGripLinesVertical} /></Button>
                    <Button size={'small'} title='Save changes' className='trim-control' onClick={saveVideo}>Save <DownloadRounded fontSize={'small'} /></Button>
                </div>
            </div>
            {loaded && (
                <ErrorBoundary>
                    <Timeline
                        currentlyGrabbedRef={currentlyGrabbedRef}
                        timings={timings} seekerBar={seekerBar}
                        playVideoRef={playVideoRef}
                        deletingGrabber={deletingGrabber}
                        setTimings={setTimings} />
                </ErrorBoundary>
            )}
            {(imageUrl !== '') &&
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
                </div>}
            {exporting && (
                <Box>
                    <Alert variant="outlined" severity="info">
                        <AlertTitle>Info</AlertTitle>
                        Your video is being exported —  Progress: <strong>{progress} %</strong>
                    </Alert>
                </Box>
            )}
        </Box>
    )
}

export default Editor