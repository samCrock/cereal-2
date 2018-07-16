import { Component, OnChanges, OnInit, OnDestroy, NgZone } from '@angular/core';
import { TorrentService, SubsService } from '../../services';
import { ElectronService } from 'ngx-electron';
import { Router } from '@angular/router';
import { TweenMax } from 'gsap';
import * as Draggable from 'gsap/Draggable';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
  providers: [TorrentService]

})
export class PlayerComponent implements OnChanges, OnInit, OnDestroy {

  public show: Object;
  public episode: Object;
  public file_path: string;

  public shell = this.electronService.remote.getGlobal('shell');
  public loading = true;
  public path = this.electronService.remote.getGlobal('path');
  public fs = this.electronService.remote.getGlobal('fs');
  public srt2vtt = this.electronService.remote.getGlobal('srt2vtt');

  public isPlaying = true;
  public isFullscreen = false;
  public currentTime = '00:00';
  public totalTime = '00:00';
  public player;
  public loopInterval;
  public idleTime;
  public lastMove = Date.now();
  public isDragging = false;
  public showSubs = false;
  public toggledEpisodes = false;
  public dn;

  constructor(
    public torrentService: TorrentService,
    public subsService: SubsService,
    public electronService: ElectronService,
    public router: Router,
    private zone: NgZone
    ) { }

  ngOnChanges() {
    console.log('ngOnChanges');
  }

  ngOnInit() {
    this.init();
  }


  init() {
    const play = JSON.parse(localStorage.getItem('play'));
    this.show = play.show;
    this.episode = play.episode;
    this.file_path = play.file_path;
    this.dn = play.episode.dn;

    // console.log(this.show);
    // console.log(this.episode);
    console.log(this.dn);
    // console.log('file_path', this.file_path);

    // Set this episode as last_seen ..

    // Set video file path
    this.fs.readdir(this.file_path, (err, files) => {
      if (files) {
        files.forEach(file => {
          const ext = file.substring(file.length - 3, file.length);
          if (ext === 'mkv' || ext === 'mp4') {
            this.file_path = this.path.join(this.file_path, file);
          }
        });
      }
    });

    // Add subs tracks
    this.subsService.retrieveSubs(this.show['title'], this.episode['label'],  this.dn)
    .subscribe(subs => {
      subs.forEach(sub => {
        this.subsService.downloadSub(sub, play.file_path).subscribe(subPath => {
          console.log('subPath', subPath);
          that.addSubs(subPath);
        });
      });
      this.setup();
    });


    const that = this;
    document.body.onkeyup = function(e) {
      if (e.keyCode === 32) {
        that.toggle_play();
      }
    };
    document.getElementById('player')
    .addEventListener('dblclick', function() {
      that.toggle_fullscreen();
    });


  }

  ngOnDestroy() {
    if (this.loopInterval) { clearInterval(this.loopInterval); }
    window.onwheel = function() {};
  }

  setup() {
    this.player = document.getElementById('player');
    // Clean player
    while (this.player.firstChild) {
      this.player.firstChild.remove();
    }
    this.player.setAttribute('src', this.file_path);
    const track = document.createElement('track');
    track.kind = 'captions';
    track.label = 'English';
    track.srclang = 'en';
    track.label = '[ Disable ]';
    this.player.appendChild(track);

    const that = this;
    const i = setInterval(function() {
      if (this.player.readyState > 0) {
        clearInterval(i);
        const duration = +this.player.duration;
        const minutes = Math.floor(duration / 60).toString().length === 1 ?
        '0' + Math.floor(duration / 60).toString() : Math.floor(duration / 60).toString();
        const seconds = Math.floor(this.player.duration % 60).toString().length === 1 ?
        '0' + Math.floor(duration % 60).toString() : Math.floor(duration % 60).toString();
        that.totalTime = minutes + ':' + seconds;

        document.addEventListener('mousemove', function() {
          that.lastMove = Date.now();
        }, false);

        document.addEventListener('dragenter', function(e) {
          e.stopPropagation();
          e.preventDefault();
        }, false);

        document.addEventListener('dragover', function(e) {
          e.stopPropagation();
          e.preventDefault();
        }, false);

        document.addEventListener('drop', function(e) {
          e.stopPropagation();
          e.preventDefault();
          const dt = e.dataTransfer,
          files = dt.files;
          console.log('Subs dropped:', files[0]);
          that.addSubs(files[0].path);
        }, false);

        that.controlsLoop();
        that.dragSetup();

      }
    }, 10);
  }

  controlsLoop() {
    const that = this;
    this.loopInterval = setInterval(() => {
      const currentTime = +that.player.currentTime;
      const totalTime = +that.player.duration;
      const minutes = Math.floor(currentTime / 60).toString().length === 1 ?
      '0' + Math.floor(currentTime / 60).toString() : Math.floor(currentTime / 60).toString();
      const seconds = Math.floor(that.player.currentTime % 60).toString().length === 1 ?
      '0' + Math.floor(currentTime % 60).toString() : Math.floor(currentTime % 60).toString();
      that.currentTime = minutes + ':' + seconds;
      that.idleTime = Math.floor(Date.now() / 100) - Math.floor(that.lastMove / 100);
    }, 100);
  }

  toggle_play() {
    this.lastMove = Date.now();
    if (this.isPlaying) {
      this.player.pause();
      this.isPlaying = false;
    } else {
      this.player.play();
      this.isPlaying = true;
    }
  }

  toggle_fullscreen() {
    if (this.isFullscreen) {
      document.webkitExitFullscreen();
      this.isFullscreen = false;
    } else {
      this.player.webkitRequestFullscreen();
      this.isFullscreen = true;
    }
  }

  addSubs(file_path) {
    if (this.fs.existsSync(file_path)) {
      const that = this;
      const track = document.createElement('track');
      track.kind = 'captions';
      track.label = 'English';
      track.srclang = 'en';
      that.fs.createReadStream(file_path)
      .pipe(that.srt2vtt())
      .pipe(that.fs.createWriteStream(file_path.substring(0, file_path.length - 3) + 'vtt'));
      setTimeout(function() {
        track.src = file_path.substring(0, file_path.length - 3) + 'vtt';
        track.label = that.path.normalize(track.src).split(that.path.sep)[that.path.normalize(track.src).split(that.path.sep).length - 1];
        track.label = track.label.substring(0, track.label.length - 4);
        let duplicate = false;
        for (const key in that.player.textTracks) {
          if (that.player.textTracks.hasOwnProperty(key)) {
            const element = that.player.textTracks[key];
            element.mode = 'hidden';
            if (key === '1') {
              element.mode = 'showing';
            }
            if (element.label === track.label) {
              duplicate = true;
            }
          }
        }
        if (!duplicate) {
          that.player.appendChild(track);
        }

        setTimeout(function() {
          const cues = that.player.textTracks[1].cues;
          // console.log('cues', cues);
          Object.keys(cues).forEach(key => {
            console.log(cues[key]);
            cues[key].snapToLines = false;
            cues[key].line = 90;
          });
        }, 10);

      }, 10);
    }
  }

  toggleSubs() {
    this.showSubs = !this.showSubs;
  }

  selectSubs(sub) {
    for (const key in this.player.textTracks) {
      if (this.player.textTracks.hasOwnProperty(key)) {
        const element = this.player.textTracks[key];
        element.mode = 'hidden';
        if (element.label === sub.label) {
          element.mode = 'showing';
        }
      }
    }
  }

  handleScroll(e) {
    e = e || window.event;
    if (e.preventDefault) {
      event.preventDefault();
      // console.log(event);
      const list = document.getElementById('episodes_list');
      if (list) {
        const list_style = window.getComputedStyle(list);
        if (e.deltaY < 0) {
          list.scrollTop -= 5.5 * parseFloat(getComputedStyle(document.documentElement).fontSize);
        } else {
          list.scrollTop += 5.5 * parseFloat(getComputedStyle(document.documentElement).fontSize);
        }
      }
    }
    e.returnValue = false;
  }

  toggleEpisodes() {
    this.toggledEpisodes = !this.toggledEpisodes;
    if (this.toggledEpisodes) {
      window.onwheel = this.handleScroll;
    }
  }

  openFolder() {
    this.shell.openItem(this.file_path);
  }

  isCurrent_episode(ep_label) {
    return ep_label === this.episode['label'];
  }

  dragSetup() {
    const video = document.getElementsByTagName('video')[0],
    timeline: HTMLElement = document.getElementById('timeline'),
    timelineProgress = document.getElementsByClassName('timeline__progress')[0],
    drag = document.getElementsByClassName('timeline__drag')[0];

    video.onplay = function() {
      TweenMax.ticker.addEventListener('tick', vidUpdate);
    };
    video.onpause = function() {
      TweenMax.ticker.removeEventListener('tick', vidUpdate);
    };
    video.onended = function() {
      TweenMax.ticker.removeEventListener('tick', vidUpdate);
    };

    video.play();

    function vidUpdate() {
      TweenMax.set(timelineProgress, {
        scaleX: (video.currentTime / video.duration).toFixed(5)
      });
      TweenMax.set(drag, {
        x: (video.currentTime / video.duration * timeline.offsetWidth).toFixed(4)
      });
    }

    const draggable = Draggable.create(drag, {
      type: 'x',
      trigger: timeline,
      bounds: timeline,
      onPress: function(e) {
        video.currentTime = this.x / this.maxX * video.duration;
        TweenMax.set(this.target, {
          x: this.pointerX - timeline.getBoundingClientRect().left
        });
        this.update();
        const progress = this.x / timeline.offsetWidth;
        TweenMax.set(timelineProgress, {
          scaleX: progress
        });
      },
      onDrag: function() {
        video.currentTime = this.x / this.maxX * video.duration;
        const progress = this.x / timeline.offsetWidth;
        TweenMax.set(timelineProgress, {
          scaleX: progress
        });
      },
      onRelease: function(e) {
        e.preventDefault();
      }
    });
  }

  play_episode(event) {
    this.zone.run(() => {
      this.init();
    });
  }


}
