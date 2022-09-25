import { Box } from "@mui/system"
import React, { useEffect, useState } from "react"
import { FC } from "react"
import { Timing } from "../types"

interface GrabberProps {
    index: number,
    timing: Timing,
    onMouseDown: any,
    onPointerDown: any,
    videoDuration: any,
}

export const Grabber: FC<GrabberProps> = ({ index, timing, onMouseDown, onPointerDown, videoDuration }) => {
    return (
        <Box key={'grabber_' + index} component={'div'} sx={{
            backgroundColor: 'rgba(100, 240, 240, 0.3)'
        }}>
            <div id='grabberStart' className='grabber start'
                style={{ left: `${timing.start / videoDuration * 100}%` }}
                onMouseDown={() => {
                    onMouseDown(index, 'start')
                }}
                onPointerDown={() => {
                    onPointerDown(index, 'start')
                }}
            >
                <svg version='1.1' xmlns='http://www.w3.org/2000/svg' x='0' y='0' width='10' height='14' viewBox='0 0 10 14' xmlSpace='preserve'>
                    <path className='st0' d='M1 14L1 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C2 13.6 1.6 14 1 14zM5 14L5 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C6 13.6 5.6 14 5 14zM9 14L9 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C10 13.6 9.6 14 9 14z' />
                </svg>
            </div>
            <div id='grabberEnd' className='grabber end'
                style={{ left: `${timing.end / videoDuration * 100}%` }}
                onMouseDown={() => {
                    onMouseDown(index, 'end')
                }}
                onPointerDown={() => {
                    onPointerDown(index, 'end')
                }}
            >
                <svg version='1.1' xmlns='http://www.w3.org/2000/svg' x='0' y='0' width='10' height='14' viewBox='0 0 10 14' xmlSpace='preserve'>
                    <path className='st0' d='M1 14L1 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C2 13.6 1.6 14 1 14zM5 14L5 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C6 13.6 5.6 14 5 14zM9 14L9 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C10 13.6 9.6 14 9 14z' />
                </svg>
            </div>
        </Box>)
}
