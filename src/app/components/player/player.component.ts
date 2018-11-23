import {Component, OnChanges, OnInit, OnDestroy, NgZone} from '@angular/core';
import {TorrentService, SubsService, DbService} from '../../services';
import {ElectronService} from 'ngx-electron';
import {Router} from '@angular/router';
import {TweenMax} from 'gsap';
import * as Draggable from 'gsap/Draggable';
import {Subscription} from 'rxjs/Subscription';
import {IntervalObservable} from 'rxjs/observable/IntervalObservable';
import {Observable} from 'rxjs/Observable';

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
  public app = this.electronService.remote.getGlobal('app');
  public shell = this.electronService.remote.getGlobal('shell');
  public loading = true;
  public path = this.electronService.remote.getGlobal('path');
  public fsExtra = this.electronService.remote.getGlobal('fsExtra');
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
  public infoHash;
  public torrent;
  private progress;
  private progressSubscription: Subscription;

  constructor(
    public torrentService: TorrentService,
    public dbService: DbService,
    public subsService: SubsService,
    public electronService: ElectronService,
    public router: Router,
    private zone: NgZone
  ) {
  }

  ngOnChanges() {
    console.log('ngOnChanges');
  }

  ngOnInit() {
    this.init();
  }

  checkVideoPath(file_path): Observable<any> {
    return new Observable(observer => {
      const that = this;
      const checkInterval = setInterval(function () {
        let files = that.fs.readdirSync(file_path);
        files.forEach(file => {
          let ext = file.substring(file.length - 3, file.length);
          if (ext === 'mkv' || ext === 'mp4' || ext === 'avi') {
            that.file_path = that.path.join(file_path, file);
            console.log('Video found ->', that.file_path);
            clearInterval(checkInterval);
            observer.next(that.file_path);
          }
          if (that.fs.statSync(that.path.join(file_path, file)).isDirectory()) {
            files = that.fs.readdirSync(that.path.join(file_path, file));
            files.forEach(_file => {
              ext = _file.substring(_file.length - 3, _file.length);
              if (ext === 'mkv' || ext === 'mp4') {
                that.file_path = that.path.join(file_path, file, _file);
                console.log('Video found ->', that.file_path);
                clearInterval(checkInterval);
                observer.next(that.file_path);
              }
            });
          }
        }, 1000);
      });
      // console.log('checkVideoPath files', files);
    });
  }

  init() {
    const play = JSON.parse(localStorage.getItem('play'));
    this.show = play.show;
    this.episode = play.episode;
    this.dn = play.episode.dn;
    this.infoHash = (play.episode && play.episode.infoHash) ? play.episode.infoHash : undefined;

    // console.log('show', this.show);
    // console.log('episode', this.episode);
    // console.log('dn', this.dn);
    console.log('infoHash', this.infoHash);
    console.log('file_path', this.file_path);

    // Set video file path (search recursively)
    this.checkVideoPath(this.path.join(this.app.getPath('downloads'), 'Cereal', this.show['title'], this.episode['label']))
      .subscribe(file_path => {
        console.log('checkVideoPath RESULT', file_path);
        // Check if this episode is ready
        if (!this.infoHash) {
          this.setup();
        } else {
          this.dbService.getTorrent(this.infoHash)
            .subscribe(t => {
              console.log('t', t);
              if (t['status'] === 'ready') {
                this.setup();
              } else {
                // Wait for 10% completion before starting video setup
                this.torrentService.getTorrent(this.infoHash)
                  .subscribe(_t => {
                    this.torrent = _t;
                    this.progressSubscription = IntervalObservable.create(1000)
                      .subscribe(() => {
                        // console.log('progressSubscription', this.torrent.progress);
                        this.torrent.progress_label = Math.ceil(this.torrent.progress * 100) + '%';
                        this.torrent.speed_label = Math.round(this.torrent['downloadSpeed'] / 1048576 * 100) / 100 + 'Mb/s';
                        if (this.torrent.progress > 0.1) {
                          this.setup();
                        }
                      });
                  });
              }
            });
        }


      });


    const that = this;
    document.body.onkeyup = function (e) {
      if (e.keyCode === 32) {
        that.toggle_play();
      }
    };
    document.getElementById('player')
      .addEventListener('dblclick', function () {
        that.toggle_fullscreen();
      });


  }

  downloadSubs() {
    // Add subs tracks
    console.log('DOWNLOADING SUBS');
    this.subsService.retrieveSubs(this.show['dashed_title'], this.episode['label'], this.dn)
      .subscribe(subs => {
        // console.log('retrieveSubs');
        subs.forEach(sub => {
          this.subsService.downloadSub(sub, this.file_path)
            .subscribe(subPath => {
              console.log('subPath', subPath);
              this.addSubs(subPath);
            });
        });
      });
  }

  setup() {
    console.log('SETUP', this.file_path);
    const that = this;

    this.downloadSubs();

    if (this.progressSubscription) {
      this.progressSubscription.unsubscribe();
    }
    this.player = document.getElementById('player');

    // Clean player
    while (this.player && this.player.firstChild) {
      this.player.firstChild.remove();
    }

    this.player.setAttribute('src', this.file_path);
    this.loading = false;

    // Restore progess
    let isReady = true;
    this.player.oncanplay = function () {
      if (isReady) {
        that.player.currentTime = that.episode['play_progress'] ?
          (that.player.duration / 100) * that.episode['play_progress'] : 0;
      }
      isReady = false;
    };

    // Setup default subs
    const track = document.createElement('track');
    track.kind = 'captions';
    track.label = 'English';
    track.srclang = 'en';
    track.label = '[ Disable ]';
    this.player.appendChild(track);

    const i = setInterval(function () {
      if (this.player.readyState > 0) {
        clearInterval(i);
        const duration = +this.player.duration;
        const minutes = Math.floor(duration / 60).toString().length === 1 ?
          '0' + Math.floor(duration / 60).toString() : Math.floor(duration / 60).toString();
        const seconds = Math.floor(this.player.duration % 60).toString().length === 1 ?
          '0' + Math.floor(duration % 60).toString() : Math.floor(duration % 60).toString();
        that.totalTime = minutes + ':' + seconds;

        document.addEventListener('mousemove', function () {
          that.lastMove = Date.now();
        }, false);

        document.addEventListener('dragenter', function (e) {
          e.stopPropagation();
          e.preventDefault();
        }, false);

        document.addEventListener('dragover', function (e) {
          e.stopPropagation();
          e.preventDefault();
        }, false);

        document.addEventListener('drop', function (e) {
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
    }, 20);
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
      document.getElementById('player').webkitRequestFullscreen();
      this.isFullscreen = true;
    }
  }

  addSubs(file_path) {
    const that = this;
    if (this.fsExtra.existsSync(file_path)) {
      const track = document.createElement('track');
      track.kind = 'captions';
      track.label = 'English';
      track.srclang = 'en';
      that.fsExtra.createReadStream(file_path)
        .pipe(that.srt2vtt())
        .pipe(that.fsExtra.createWriteStream(file_path.substring(0, file_path.length - 3) + 'vtt'));
      // setTimeout(function() {
      track.src = file_path.substring(0, file_path.length - 3) + 'vtt';
      track.label = that.path.normalize(track.src).split(that.path.sep)[that.path.normalize(track.src).split(that.path.sep).length - 1];
      track.label = track.label.substring(0, track.label.length - 4);
      track.label = decodeURI(track.label);
      let duplicate = false;
      for (const key in that.player.textTracks) {
        if (that.player.textTracks.hasOwnProperty(key)) {
          const trackElement = that.player.textTracks[key];
          trackElement.mode = 'hidden';
          if (trackElement.label === track.label) {
            duplicate = true;
          }
        }
      }
      if (that.player.textTracks['1']) {
        that.player.textTracks['1'].mode = 'showing';
      }
      if (!duplicate) {
        that.player.appendChild(track);
      }

      setTimeout(function () {
        const cues = that.player.textTracks[1].cues;
        if (cues) {
          Object.keys(cues).forEach(key => {
            cues[key].snapToLines = false;
            cues[key].line = 90;
          });
        }
        for (const key in that.player.textTracks) {
          if (that.player.textTracks.hasOwnProperty(key)) {
            that.player.textTracks[key].mode = 'hidden';
          }
        }
        if (that.player.textTracks['1']) {
          that.player.textTracks['1'].mode = 'showing';
        }
      }, 100);

      // }, 1);
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
    setTimeout(() => {
      this.showSubs = false;
    }, 200);
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

    video.onplay = function () {
      TweenMax.ticker.addEventListener('tick', vidUpdate);
    };
    video.onpause = function () {
      TweenMax.ticker.removeEventListener('tick', vidUpdate);
    };
    video.onended = function () {
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
      onPress: function (e) {
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
      onDrag: function () {
        video.currentTime = this.x / this.maxX * video.duration;
        const progress = this.x / timeline.offsetWidth;
        TweenMax.set(timelineProgress, {
          scaleX: progress
        });
      },
      onRelease: function (e) {
        e.preventDefault();
      }
    });
  }

  play_episode(event) {
    this.zone.run(() => {
      this.init();
    });
  }

  ngOnDestroy() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
    }
    window.onwheel = function () {
    };
    if (this.player) {
      console.log('Seconds viewed on destroy:', this.player.currentTime);
      const play_progress = Math.ceil((this.player.currentTime / this.player.duration) * 100);
      this.dbService.setEpisodeProgress(this.show['dashed_title'], this.episode['label'], play_progress)
        .subscribe(show => {
          console.log('Updated show', show);
        });
    }
  }

  showProgress() {
    return this.torrent && this.torrent.progress < 0.1;
  }

}
