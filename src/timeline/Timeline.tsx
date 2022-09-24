import React, { useCallback, useState } from "react";
import { Dispatch, FC, SetStateAction, useEffect, useRef } from "react";
import { Timing } from "../types";
import { Grabber } from "./Grabber";



interface TimelineProps {
    playVideoRef: React.MutableRefObject<HTMLVideoElement>;
    timings: Timing[];
    setTimings: Dispatch<SetStateAction<Timing[]>>;
    deletingGrabber: boolean;
    seekerBar: number
}


const difference = 0.2

const TimelineComp: FC<TimelineProps> = ({ playVideoRef, deletingGrabber, timings, setTimings, seekerBar }) => {
    const currentlyGrabbedRef = useRef({ 'index': 'grabber_0', 'type': 'none' })
    const progressBarRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
    const playBackBarRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;

    useEffect(() => {
        const currentIndex = timings.findIndex(i => i.id === currentlyGrabbedRef.current.index);
        if (!currentIndex) return;
        const seek = (playVideoRef?.current?.currentTime - timings[0].start) / playVideoRef.current.duration * 100
        progressBarRef.current.style.width = `${seek}%`
        if (!!timings[currentIndex + 1] && (playVideoRef.current.currentTime >= timings[currentIndex].end)) {
            playVideoRef.current.pause()
            currentlyGrabbedRef.current = ({ 'index': timings[currentIndex + 1].id, 'type': 'start' })
            progressBarRef.current.style.width = '0%'
            progressBarRef.current.style.left = `${timings[currentIndex].start / playVideoRef.current.duration * 100}%`
            playVideoRef.current.currentTime = timings[currentIndex].start
            playVideoRef.current.play()
        }
        console.log(timings)
    }, [playVideoRef, timings, currentlyGrabbedRef, progressBarRef, playVideoRef.current.currentTime])

    useEffect(() => {
        return () => {
            window.removeEventListener('mouseup', handleMouseMoveWhenGrabbed)
            window.removeEventListener('pointerup', handleMouseMoveWhenGrabbed)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleMouseMoveWhenGrabbed = (event: { clientX: number; }) => {
        playVideoRef.current?.pause()
        addActiveSegments()
        let playbackRect = playBackBarRef.current.getBoundingClientRect()
        let seekRatio = (event.clientX - playbackRect.left) / playbackRect.width
        const index = timings.findIndex(i => i.id === currentlyGrabbedRef.current.index);
        const type = currentlyGrabbedRef.current.type
        let time = timings
        let seek = playVideoRef.current.duration * seekRatio
        if ((type === 'start') && (seek > ((index !== 0) ? (time[index - 1].end + difference + 0.2) : 0)) && seek < time[index].end - difference) {
            progressBarRef.current.style.left = `${seekRatio * 100}%`
            playVideoRef.current.currentTime = seek
            time[index].start = seek
            setTimings([...time])
        }
        else if ((type === 'end') && (seek > time[index].start + difference) && (seek < (index !== (timings.length - 1) ? time[index].start - difference - 0.2 : playVideoRef.current.duration))) {
            progressBarRef.current.style.left = `${time[index].start / playVideoRef.current.duration * 100}%`
            playVideoRef.current.currentTime = time[index].start
            time[index].end = seek
            setTimings([...time])
        }
        progressBarRef.current.style.width = '0%'
    }

    const addActiveSegments = useCallback(() => {
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

    }, [playVideoRef, timings])

    useEffect(() => {
        addActiveSegments()
    }, [timings, addActiveSegments])
    const removeMouseMoveEventListener = () => {
        window.removeEventListener('mousemove', handleMouseMoveWhenGrabbed)
    }
    const removePointerMoveEventListener = () => {
        window.removeEventListener('pointermove', handleMouseMoveWhenGrabbed)
    }

    const updateProgress = (event: { clientX: number }) => {
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
        currentlyGrabbedRef.current = { 'index': timings[index].id, 'type': 'start' }
        progressBarRef.current.style.width = '0%'
        progressBarRef.current.style.left = `${timings[index].start / playVideoRef.current.duration * 100}%`
        playVideoRef.current.currentTime = seekTime
    }
    const deleteGrabber = (index: number) => {
        let time = timings
        currentlyGrabbedRef.current = { 'index': timings[index].id, 'type': 'start' }
        if (time.length === 1) {
            return
        }
        time.splice(index, 1)
        progressBarRef.current.style.left = `${time[0].start / playVideoRef.current.duration * 100}%`
        playVideoRef.current.currentTime = time[0].start
        progressBarRef.current.style.width = '0%'
        setTimings([...timings, ...time])
    }

    const onMouseDown = (index: number, type: string) => {
        if (deletingGrabber) {
            deleteGrabber(index)
        }
        else {
            currentlyGrabbedRef.current = { 'index': timings[index].id, 'type': type }
            window.addEventListener('mousemove', handleMouseMoveWhenGrabbed)
            window.addEventListener('mouseup', removeMouseMoveEventListener)
        }
    }
    const onPointerDown = (index: number, type: string) => {
        if (deletingGrabber) {
            deleteGrabber(index)
        }
        else {
            currentlyGrabbedRef.current = { 'index': timings[index].id, 'type': type }
            window.addEventListener('pointermove', handleMouseMoveWhenGrabbed)
            window.addEventListener('pointerup', removePointerMoveEventListener)
        }
    }
    return (
        <div className='playback'>
            {timings.length > 0 &&
                timings.map((timing, index) => (
                    <Grabber videoDuration={playVideoRef.current?.duration} timing={timing} index={index} onMouseDown={onMouseDown} onPointerDown={onPointerDown} />
                ))}
            <div className='seekable' ref={playBackBarRef} onClick={updateProgress}></div>
            <div className='progress' ref={progressBarRef}></div>
        </div>
    )

}

export const Timeline = React.memo(TimelineComp);
