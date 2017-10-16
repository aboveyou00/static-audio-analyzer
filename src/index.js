

const fs = require('fs');
const { Decoder } = require('lame');
const Speaker = require('speaker');
// const Analyser = require('audio-analyser');
const Through = require('audio-through');
const util = require('audio-buffer-utils');

let shouldExit = false;
let sampleRate = 44100;
let maxFrameSamples = 1470;
let framesPerSecond = 30;
let frameSampleCount = 0;
let frameSampleTotal = 0;
let frames = [];
let maxFrame = 0;

let music = fs.createReadStream('assets/jump_rope_blue_october.mp3')
  .pipe(new Decoder())
  .on('format', fmt => {
      sampleRate = fmt.sampleRate;
      this.maxFrameSamples = sampleRate / framesPerSecond;
      console.log(fmt);
  });

music
  .pipe(new Through(function(buffer) {
      let shouldBeFrame = Math.round(this.time * framesPerSecond);
      if (shouldBeFrame > frames.length + 5 || shouldBeFrame < frames.length - 5) {
          throw new Error(`Frames are not matching up! Current frame: ${frames.length}. Should be frame: ${shouldBeFrame}`);
      }
      let sampleNum = 0;
      
      let channelCount = buffer.numberOfChannels;
      let channelData = [];
      for (let q = 0; q < channelCount; q++) {
          channelData.push(buffer.getChannelData(q));
      }
      for (let q = 0; q < buffer.length; q++) {
          if (frameSampleCount < maxFrameSamples) {
              frameSampleCount++;
              for (let w = 0; w < channelCount; w++) {
                  let sample = channelData[w][q];
                  frameSampleTotal += Math.abs(sample);
              }
          }
          else {
              let frameSampleAvg = frameSampleTotal / (frameSampleCount * channelCount);
              frames.push(frameSampleAvg);
              if (frames.length % framesPerSecond === 0) console.log('frame ', frames.length);
              if (frameSampleAvg > maxFrame) maxFrame = frameSampleAvg;
              frameSampleCount = 0;
              frameSampleTotal = 0;
          }
          // let timeOffset = sampleNum++ / 44100;
          // let scale = Math.abs(((this.time + timeOffset) % 2) - 1);
          // buffer[q] = sample * scale;
      }
  }, {
      sink: true
  }))
  .on('end', () => {
      for (let q = 0; q < frames.length; q++) {
          frames[q] /= maxFrame;
      }
      fs.writeFileSync('output/data.json', JSON.stringify(frames));
      shouldExit = true;
      console.log(`Done! ${frames.length} frames written to output/data.json`);
  })
  .pipe(new Speaker());
//   .pipe(require('stream-sink').object());

process.on('exit', () => console.log('Exiting'));

(function wait () {
    if (!shouldExit) setTimeout(wait, 1000);
})();
