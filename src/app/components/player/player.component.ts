import { Component, Input, OnChanges, OnInit, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { DbService, SubsService, ScrapingService, TorrentService } from '../../services';
import * as moment from 'moment';
import { ElectronService } from 'ngx-electron';
import * as magnet from 'magnet-uri';
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

  private show: Object;
  private episode: Object;
  private file_path: string;

  private shell = this.electronService.remote.getGlobal('shell');
  private loading = true;
  private path = this.electronService.remote.getGlobal('path');
  private fs = this.electronService.remote.getGlobal('fs');
  private srt2vtt = this.electronService.remote.getGlobal('srt2vtt');

  private isPlaying = true;
  private isFullscreen = false;
  private currentTime = '00:00';
  private totalTime = '00:00';
  private player;
  private loopInterval;
  private idleTime;
  private lastMove = Date.now();
  private isDragging = false;
  private showSubs = false;

  constructor(
    private torrentService: TorrentService,
    private electronService: ElectronService,
    private router: Router
    ) { }

  ngOnChanges() {
    console.log('ngOnChanges');
  }

  ngOnInit() {
    const play = JSON.parse(localStorage.getItem('play'));
    this.show = play.show;
    this.episode = play.episode;
    this.file_path = play.file_path;

    // console.log(this.show);
    // console.log(this.episode);
    console.log('file_path', this.file_path);

    // Set this episode as last_seen ..


    this.fs.readdir(this.file_path, (err, files) => {
      if (files) {
        files.forEach(file => {
          console.log('file', file);
          const ext = file.substring(file.length - 3, file.length);
          if (ext === 'mkv' || ext === 'mp4') {
            console.log('File extension:', ext);
            this.file_path = this.path.join(this.file_path, file);
          } else if (ext === 'srt') {
            const subs_path = this.path.join(this.file_path, file);
            console.log('Subs:', file);
            that.addSubs(subs_path);
          }
        });
      }
      this.setup();
    });

    const parent_folder = this.path.resolve(this.file_path, '..');
    this.fs.readdir(parent_folder, (err, files) => {
      files.forEach(file => {
        // console.log('Folder file', file);
        const ext = file.substring(file.length - 3, file.length);
        if (ext === 'srt') {
          const subs_path = this.path.join(parent_folder, file);
          console.log('Subs:', subs_path);
          that.addSubs(subs_path);
        }
      });
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
  }

  setup() {
    this.player = document.getElementById('player');
    console.log('File path', this.file_path);
    this.player.setAttribute('src', this.file_path);

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
    }, 200);
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
        that.player.appendChild(track);
        that.player.textTracks[0].mode = 'showing';

        setTimeout(function() {
          const cues = that.player.textTracks[0].cues;
        // console.log('cues', cues);
        Object.keys(cues).forEach(key => {
          // console.log(cues[key]);
          cues[key].line = 15;
        });
        that.showSubs = true;

      }, 1000);

      }, 1000);
    }
  }

  toggleSubs() {
    if (this.player.textTracks[0]) {
      const mode = this.player.textTracks[0].mode;
      console.log('toggleSubs', mode);
      if (mode === 'hidden') {
        this.player.textTracks[0].mode = 'showing';
        this.showSubs = true;
      } else {
        this.player.textTracks[0].mode = 'hidden';
        this.showSubs = false;
      }
    }
  }

  toggleEpisodes() {
    console.log('toggleEpisodes');
  }

  openFolder() {
    this.shell.openItem(this.file_path);
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



}
