import React, { useState, useEffect } from 'react';
import './App.css';

import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
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
  }, [])


  return ready ? (<div className="App">

    {video && <video
      controls
      width="250"
      src={URL.createObjectURL(video)}>

    </video>}

    <input type="file" onChange={(e) => setVideo(e.target?.files?.item(0)!)} />


  </div>) : (<p>Loading...</p >);
}

export default App;
