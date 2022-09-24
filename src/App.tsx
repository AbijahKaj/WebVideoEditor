import React, { useState, useEffect } from 'react';
import './App.css';
import { createFFmpeg } from '@ffmpeg/ffmpeg';
import { FileDrop } from 'react-file-drop'
import Editor from './Editor';
import { Box, Button, Grid } from '@mui/material';


const ffmpeg = createFFmpeg({ corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js', log: true });

function App() {
  const [ready, setReady] = useState(false);
  const [video, setVideo] = useState<MediaSource | File>();

  const load = async () => {
    await ffmpeg.load();
    setReady(true);
  }
  useEffect(() => {
    load();
    document.addEventListener('drop', function (e) {
      e.preventDefault()
      e.stopPropagation()
    })
  }, [])

  const startUploading = (files: FileList | null) => {
    files && setVideo(files[0]);
  }


  return (
    <Grid container sx={{ marginTop: 10 }}>
      {ready ?
        (video ? (
          <Editor
            videoUrl={URL.createObjectURL(video)}
            ffmpeg={ffmpeg}
          />
        ) : (
          <Box component="span" sx={{ p: 2, width: '100%' }}>
            <input
              onChange={(e) => startUploading(e.target.files)}
              type='file'
              className='hidden'
              id='upload'
            />
            <FileDrop
              onDrop={startUploading}
              onTargetClick={() => document.getElementById('upload')?.click()}
            >
              <Button>Upload</Button>
            </FileDrop>
          </Box>
        )) : (<p>Loading...</p >)}
    </Grid>);
}

export default App;
