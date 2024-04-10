
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques
// !

// Quarter note is 140 bpm
let tempo = 140.0;
// Sequence eighth-notes
let note = 8;
// Tempo is 4tr note:
const secondsPerBeat = 60.0 / tempo;

class BeatBox {
    constructor() {
        this.sample_names = ["clap", "unnn", "snap"];

        this.ctx = null;

        this.container = document.createElement("div");
        this.box = document.createElement("div");
        this.container.appendChild(this.box);

        this.box.id = "box";
        const cols = 100.0 / note;
        let style = `grid-template-columns: repeat(${note}, 1fr); `;
        this.box.style = style;
        for(const sample of ["clap", "unnn", "snap"]) {
            // this.add_sample(sample);
        }

        this.control = document.createElement("p");
        this.control.innerText = "▶";
        this.control.id = "playctl";
        this.control.addEventListener("click", (control, ev) => {
            if (this.playing) {
                this.pause();
            } else {
                this.play();
            }
        })
        this.container.appendChild(this.control);

        this.timer = null;
        this.beat = 0;
        this.nextNoteTime = 0.0;
        this.buffers = new Map();
        this.playing = false;
    }

    prepare() {
        if(this.ctx == null) {
            console.log("setting up audio context...");
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
    }

    add_sample(name, blob) {
        (async (name, blob) => {
            let data = await blob.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(data);
            this.buffers.set(name, audioBuffer);

            // Now we have the sample, add it to the sequencer.
            let i = this.sample_names.length;
            this.sample_names.push(name);
            for (let j = 0; j < note; j++) {
                const cell = document.createElement("button");
                for (let cls of ["key", "inactive", `row-${i}`, `col-${j}`]) {
                    cell.classList.add(cls);
                }
                cell.addEventListener("click", (receiver, ev) => {
                    this.press(j, i);
                });
                cell.innerText = this.sample_names[i];
                this.box.appendChild(cell);
            }
        })(name, blob)
    }

    play() {
        this.prepare();
        console.log("playing");
        this.playing = true;
        this.beat = 0;

        this.control.innerText = "⏸";

        if (this.ctx.state === "suspended") {
            this.ctx.resume()
        }

        this.tick();
    }
    pause() {
        console.log("paused");
        this.playing = false;
        this.control.innerText = "▶";

        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    tick() {
        if (!this.playing) {
            return;
        }
        // Shamelessly from https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques#playing_the_audio_in_time
        const lookahead = 25.0; // millisec
        const scheduleAheadTime = 0.1; // sec
        const tickTime = secondsPerBeat / (note / 4)

        while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
            for (let pad of document.querySelectorAll(`button.key.col-${this.beat}`)) {
                if (pad.classList.contains("active")) {
                    const buffer = this.buffers.get(pad.innerText);
                    const sampleSource = new AudioBufferSourceNode(this.ctx, { buffer: buffer });
                    sampleSource.connect(this.ctx.destination);
                    sampleSource.start(this.nextNoteTime);
                }
            }

            this.nextNoteTime += tickTime;
            this.beat = (this.beat + 1) % note;
        }
        this.timerId = setTimeout(() => { this.tick() }, lookahead);
    }

    insert(parent) {
        parent.replaceWith(this.container)
    }

    press(x, y) {
        console.log(`got press: ${x}, ${y}`);
        let key = document.getElementsByClassName(`row-${y} col-${x}`)[0];
        if (key.classList.contains("inactive")) {
            key.classList.remove("inactive");
            key.classList.add("active");
        } else {
            key.classList.remove("active");
            key.classList.add("inactive");
        }
    }
}


const bb = new BeatBox();
bb.insert(document.getElementById("box-loader"));

class Recorder {
    constructor(bb) {
        this.bb = bb;
        this.button = document.getElementById("record");
        this.ident = document.getElementById("name");
        this.status = document.getElementById("recording");

        this.recorder = null;

        this.state = -1;
        this.chunks = [];
    }

    countdown() {
        if(this.state == -1) {
            // Early setup of audio context, so we can rely on it when adding the buffer.
            this.bb.prepare();
            this.state = 3;
        }
        if(this.state > 0) {
            this.status.innerText = `${this.state}`;
            this.state -= 1;
            setTimeout(() => { this.countdown() }, 1000 * secondsPerBeat);
            return;
        }
        // this.state == 0, we're recording
        this.status.innerText = "Let's jam!";
        this.recorder.start();
        console.log("recorder: ", this.recorder.state);
        setTimeout(() => { this.complete() }, secondsPerBeat * 1000);
    }

    complete() {
        this.recorder.stop();
        console.log("recorder: ", this.recorder.state);
        this.status.innerText = "Ready?";
        this.state = -1;
    }

    append() {
        console.log("handling media");
        const blob = new Blob(this.chunks, { type: this.recorder.mimeType });
        this.chunks = [];
        const name = this.ident.value;
        this.bb.add_sample(name, blob);

    }

    attach(stream) {
        this.recorder = new MediaRecorder(stream);
        this.recorder.addEventListener("dataavailable", (ev) => {
            console.log("got media data");
             this.chunks.push(ev.data) });
        this.recorder.addEventListener("stop", (ev) => { this.append() });


        this.button.addEventListener("click", () => { this.countdown() });
    }

    disable() {
        this.button.disabled = true;
        this.ident.disabled = true;
        this.status.innerText = "Cannot add samples."
    }
};

const recorder = new Recorder(bb);

navigator.mediaDevices.getUserMedia({audio: true}).then(
     (stream) => { recorder.attach(stream); },
     () => { recorder.disable() }
);


