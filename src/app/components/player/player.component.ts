import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { TorrentService, SubsService, DbService } from '../../services';
import { ElectronService } from 'ngx-electron';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription ,  Observable } from 'rxjs';

import { interval } from 'rxjs/internal/observable/interval';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
  providers: [TorrentService]

})
export class PlayerComponent implements OnInit, OnDestroy {

  public show: Object;
  public episode: Object;
  public filePath: string;
  public app = this.electronService.remote.getGlobal('app');
  public shell = this.electronService.remote.getGlobal('shell');
  public loading = true;
  public path = this.electronService.remote.getGlobal('path');
  public fsExtra = this.electronService.remote.getGlobal('fsExtra');
  public fs = this.electronService.remote.getGlobal('fs');
  public srt2vtt = this.electronService.remote.getGlobal('srt2vtt');
  public remote = this.electronService.remote;

  public isPlaying = true;
  public isFullscreen = false;
  public currentTime = '00:00';
  public totalTime = '00:00';
  public player;
  public loopInterval;
  public filesCheckInterval;
  public idleTime;
  public lastMove = Date.now();
  public isDragging = false;
  public showSubs = false;
  public toggledEpisodes = false;
  public dn;
  public infoHash;
  public torrent;
  public speed;
  public progress;
  private progressSubscription: Subscription;

  constructor(
    public torrentService: TorrentService,
    public dbService: DbService,
    public subsService: SubsService,
    public electronService: ElectronService,
    public router: Router,
    public route: ActivatedRoute,
    private zone: NgZone,
    private cdRef: ChangeDetectorRef
  ) {
  }

  ngOnInit() {
    this.init();
  }

  ngOnDestroy() {
    if (this.loopInterval) { clearInterval(this.loopInterval); }
    if (this.filesCheckInterval) { clearInterval(this.filesCheckInterval); }
    if (this.progressSubscription) { this.progressSubscription.unsubscribe(); }

    window.onwheel = function () { };
    if (this.player) {
      console.log('Seconds viewed on destroy:', this.player.currentTime);
      const play_progress = Math.ceil((this.player.currentTime / this.player.duration) * 100);
      this.dbService.setEpisodeProgress(this.show['dashed_title'], this.episode['label'], play_progress)
        .subscribe(show => {
          console.log('Updated show', show);
        });
    }
  }



  init() {
    console.log(this.route.snapshot.params);
    this.dbService.getShow(this.route.snapshot.params.show)
      .subscribe(show => {
        this.show = show;
        console.log('Show ->', show);
        this.dbService.getEpisode(this.route.snapshot.params.show, this.route.snapshot.params.episode)
          .subscribe(episode => {
            this.episode = episode;
            console.log('Episode ->', episode);

            this.checkVideoPath()
              .subscribe(filePath => {
                this.filePath = filePath;
                this.setup();
              });

          });
      });
  }

  setup() {
    console.log('SETUP');

    const document: any = window.document;
    const that = this;

    this.fetchProgress();


    this.player = document.getElementById('player');

    // Clean player
    while (this.player && this.player.firstChild) {
      this.player.firstChild.remove();
    }

    this.player.setAttribute('src', this.filePath);

    // Set keybindings
    document.body.onkeyup = (e) => {
      if (e.keyCode === 32) {
        that.toggle_play();
      }
    };
    document.getElementById('player')
      .addEventListener('dblclick', () => {
        that.toggle_fullscreen();
      });

    // Download subs
    this.downloadSubs();

    this.loading = false;

    // Setup default subs
    const track = document.createElement('track');
    track.kind = 'captions';
    track.label = 'English';
    track.srclang = 'en';
    track.label = '[ Disable ]';
    this.player.appendChild(track);

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

    let firstSetup = true;

    that.player.addEventListener('loadeddata', function () {
      console.log('that.player.readyState', that.player.readyState);
      if (that.player && that.player.readyState === 4) {
        const duration = +that.player.duration;
        const minutes = Math.floor(duration / 60).toString().length === 1 ?
          '0' + Math.floor(duration / 60).toString() : Math.floor(duration / 60).toString();
        const seconds = Math.floor(that.player.duration % 60).toString().length === 1 ?
          '0' + Math.floor(duration % 60).toString() : Math.floor(duration % 60).toString();
        that.totalTime = minutes + ':' + seconds;

        if (firstSetup) {
          that.controlsLoop();
          that.timelineSetup();
        }
        firstSetup = false;
      }
    });


  }

  checkVideoPath(): Observable<any> {
    return new Observable(observer => {
      const that = this;
      const filePath = that.path.join(that.app.getPath('downloads'), 'Cereal', that.show['title'], that.episode['label']);
      const filesCheckInterval = setInterval(() => {
        console.log('Check files', filePath, that.fs.existsSync(filePath));
        if (that.fs.existsSync(filePath)) {
          let files = that.fs.readdirSync(filePath);
          files.forEach(file => {
            let ext = file.substring(file.length - 3, file.length);
            if (ext === 'mkv' || ext === 'mp4' || ext === 'avi') {
              that.filePath = that.path.join(filePath, file);
              console.log('Video found ->', that.filePath);
              clearInterval(filesCheckInterval);
              observer.next(that.filePath);
            }
            if (that.fs.statSync(that.path.join(filePath, file)).isDirectory()) {
              files = that.fs.readdirSync(that.path.join(filePath, file));
              files.forEach(_file => {
                ext = _file.substring(_file.length - 3, _file.length);
                if (ext === 'mkv' || ext === 'mp4') {
                  that.filePath = that.path.join(filePath, file, _file);
                  console.log('Video found ->', that.filePath);
                  clearInterval(filesCheckInterval);
                  observer.next(that.filePath);
                }
              });
            }
          });
        }
      }, 1000);
    });
  }

  // Subtitles
  downloadSubs() {
    // Add subs tracks
    console.log('DOWNLOADING SUBS');
    let fileName = this.path.basename(this.filePath);
    fileName = fileName.substring(0, fileName.length - 4);
    const dn = this.dn ? this.dn : fileName;
    this.subsService.retrieveSubs(this.show, this.episode['label'], dn)
      .subscribe(subs => {
        subs.forEach(sub => {
          this.subsService.downloadSub(sub, this.filePath)
            .subscribe(subPath => {
              console.log('subPath', subPath);
              this.addSubs(subPath);
            });
        });
      });
  }

  addSubs(filePath) {
    const that = this;
    if (this.fsExtra.existsSync(filePath)) {
      const track = document.createElement('track');
      track.kind = 'captions';
      track.label = 'English';
      track.srclang = 'en';
      that.fsExtra.createReadStream(filePath)
        .pipe(that.srt2vtt())
        .pipe(that.fsExtra.createWriteStream(filePath.substring(0, filePath.length - 3) + 'vtt'));
      // setTimeout(function() {
      track.src = filePath.substring(0, filePath.length - 3) + 'vtt';
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

  // Controls
  controlsLoop() {
    const that = this;
    this.loopInterval = setInterval(() => {
      const currentTime = +that.player.currentTime;
      // const totalTime = +that.player.duration;
      const minutes = Math.floor(currentTime / 60).toString().length === 1 ?
        '0' + Math.floor(currentTime / 60).toString() : Math.floor(currentTime / 60).toString();
      const seconds = Math.floor(that.player.currentTime % 60).toString().length === 1 ?
        '0' + Math.floor(currentTime % 60).toString() : Math.floor(currentTime % 60).toString();
      that.currentTime = minutes + ':' + seconds;
      that.idleTime = Math.floor(Date.now() / 100) - Math.floor(that.lastMove / 100);
    }, 1000);
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
    const document: any = window.document;
    if (this.isFullscreen) {
      document.webkitExitFullscreen();
      this.isFullscreen = false;
    } else {
      document.getElementById('player').webkitRequestFullscreen();
      this.isFullscreen = true;
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
    this.shell.openItem(this.filePath);
  }

  isCurrent_episode(ep_label) {
    return ep_label === this.episode['label'];
  }

  timelineSetup() {
    const video = document.getElementsByTagName('video')[0];
    const timeline: HTMLInputElement = document.getElementById('timeline') as HTMLInputElement;

    video.play();

    timeline.addEventListener('change', function () {
      // Calculate the new time
      const value: number = parseInt(timeline.value, 10);
      const time = video.duration * (value / 100);
      // Update the video time
      video.currentTime = time;
    });

    if (this.episode['play_progress']) {
      console.log('Restoring playback progress', this.episode['play_progress']);
      timeline.value = this.episode['play_progress'];
      this.player.currentTime = this.episode['play_progress'] ? (this.player.duration / 100) * this.episode['play_progress'] : 0;
    }

  }

  play_episode(event) {
    this.zone.run(() => {
      this.init();
    });
  }

  fetchProgress() {
    this.progressSubscription = interval(1000).subscribe(() => {
      if (this.episode && this.episode['status'] === 'pending') {
        const that = this;
        const t = this.torrentService.getTorrentByHash(this.episode['infoHash']);
        if (t) {

          // console.log('fetchProgress', t.infoHash, t.progress, t.downloadSpeed);

          if (t['progress'] !== 1) {
            that.speed = (Math.round(t['downloadSpeed'] / 1048576 * 100) / 100).toString();
            that.progress = Math.round(t['progress'] * 100);
            that.cdRef.detectChanges();
          } else {
            that.progress = 100;
            delete that.speed;
            this.progressSubscription.unsubscribe();
          }
        }
      }
      if (this.episode && this.episode['status'] === 'ready') {
        this.progress = 100;
        delete this.speed;
        this.progressSubscription.unsubscribe();
      }
    });
  }


  // Navbar clone
  quit() {
    this.remote.getCurrentWindow().close();
  }

  minimize() {
    this.remote.getCurrentWindow().minimize();
  }

}
