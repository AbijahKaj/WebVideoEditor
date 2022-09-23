import React, { useState, useEffect } from 'react';
import './App.css';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { FileDrop } from 'react-file-drop'


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


  return ready ? (<div className="App">
    <div className={'wrapper'}>
      {video ? (
        <div
          style={{
            maxHeight: '100vh',
          }}> <video
            controls={false}
          >
            <source src={URL.createObjectURL(video)}></source>
          </video></div>
      ) : (
        <>
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
            Upload
          </FileDrop>
        </>
      )}
    </div>
  </div>) : (<p>Loading...</p >);
}

export default App;
