
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques
// !

class BeatBox {
    constructor(w) {
        this.sample_names = ["clap", "unts", "snap", "pfft"];

        this.ctx = null;
        this.width = w;
        this.height = this.sample_names.length;

        this.container = document.createElement("div");
        this.box = document.createElement("div");
        this.container.appendChild(this.box);

        this.box.id = "box";
        const cols = 100.0 / this.width;
        const rows = 100.0 / this.height;
        let style = `grid-template-columns: repeat(${w}, 1fr); grid-auto-rows: ${rows};`;
        this.box.style = style;
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
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

    play() {
        if (this.ctx === null) {
            // We should actually disable control while we're setting up, but that's hard.
            console.log("setting up audio context...");
            this.control.innerText = "…";
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // Do initial setup, async:
            async function setupSample(sample) {
            };
            Promise.all(this.sample_names.map(
                async (sample_name) => {
                    // TODO actually use different tracks
                    const response = await fetch(`samples/clap.wav`);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                    this.buffers.set(sample_name, audioBuffer);
                }
            )).then(() => {
                console.log("loaded samples, starting");
                this.play();
            });
            return;
        }
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
        if(!this.playing) {
            return;
        }
        // Shamelessly from https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques#playing_the_audio_in_time
        let tempo = 60.0;
        const lookahead = 25.0; // millisec
        const scheduleAheadTime = 0.1; // sec
        const secondsPerBeat = 60.0 / tempo;

        while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
            console.log("scheduling pass for ", this.nextNoteTime)
            for (let pad of document.querySelectorAll(`button.key.col-${this.beat}`)) {
                if (pad.classList.contains("active")) {
                    console.log("activating ", pad.innerText, " at ", this.nextNoteTime)
                    const buffer = this.buffers.get(pad.innerText);
                    const sampleSource = new AudioBufferSourceNode(this.ctx, { buffer: buffer });
                    sampleSource.connect(this.ctx.destination);
                    sampleSource.start(this.nextNoteTime);
                }
            }

            this.nextNoteTime += secondsPerBeat;
            this.beat = (this.beat + 1) % (this.width);
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



(new BeatBox(4, 4)).insert(document.getElementById("box-loader"));

