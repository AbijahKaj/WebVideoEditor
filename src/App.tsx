import { useState, useEffect } from 'react';
import './App.css';
import { createFFmpeg } from '@ffmpeg/ffmpeg';
import { FileDrop } from 'react-file-drop'
import Editor from './editor/Editor';
import { Box, Button, Grid, Typography } from '@mui/material';
import { UploadFileOutlined } from '@mui/icons-material';


const ffmpeg = createFFmpeg({ log: true });

function App() {
  const [ready, setReady] = useState(false);
  const [video, setVideo] = useState<MediaSource | File>();

  const load = async () => {
    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
      setReady(true);
    }
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
              <Button variant="outlined" sx={{ marginBottom: 5 }}>Upload</Button>
              <Box alignContent={'space-around'}>
                <UploadFileOutlined color='secondary' />
                <Typography
                  variant="subtitle1"
                  align="center"
                  color="text.secondary"
                  component="p"
                >Or Drag&Drop a file
                </Typography>
              </Box>
            </FileDrop>
          </Box>
        )) : (<p>Loading...</p >)}
    </Grid>);
}

export default App;
