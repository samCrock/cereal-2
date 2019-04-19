import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  TorrentService,
  SubsService,
  DbService,
  ScrapingService
} from '../../services';
import { ElectronService } from 'ngx-electron';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { interval } from 'rxjs/internal/observable/interval';
import { ChangeDetectorRef } from '@angular/core';
import * as magnet from 'magnet-uri';
import * as moment from 'moment';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
  providers: [TorrentService, ScrapingService]
})
export class PlayerComponent implements OnInit, OnDestroy {
  public show;
  public episode;
  public filePath: string;
  public app = this.electronService.remote.getGlobal('app');
  public shell = this.electronService.remote.getGlobal('shell');
  public loading = true;
  public path = this.electronService.remote.getGlobal('path');
  public fsExtra = this.electronService.remote.getGlobal('fsExtra');
  public fs = this.electronService.remote.getGlobal('fs');
  public srt2vtt = this.electronService.remote.getGlobal('srt2vtt');
  public remote = this.electronService.remote;
  public server;

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
  public dn;
  public infoHash;
  public torrent;
  public speed;
  public progress;
  private progressSubscription: Subscription;
  private routeSubscription: Subscription;
  public nextEpisode;
  public subtitlesPaths = [];

  constructor(
    public torrentService: TorrentService,
    public dbService: DbService,
    public subsService: SubsService,
    public scrapingService: ScrapingService,
    public electronService: ElectronService,
    public router: Router,
    public route: ActivatedRoute,
    private cdRef: ChangeDetectorRef
  ) {
    // Listen to route change
    this.routeSubscription = router.events.subscribe(val => {
      if (val instanceof NavigationEnd && val.url.startsWith('/play')) {
        console.log('--------------', val.url);
        this.clean();
        this.init();
      }
    });
  }

  ngOnInit() { }

  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    this.clean();
  }

  clean() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
    }
    if (this.filesCheckInterval) {
      clearInterval(this.filesCheckInterval);
    }
    if (this.progressSubscription) {
      this.progressSubscription.unsubscribe();
    }

    if (this.player) {
      // Clean player
      while (this.player && this.player.firstChild) {
        this.player.firstChild.remove();
      }

      // console.log('Played time:', this.player.currentTime);
      const playProgress = Math.ceil(
        (this.player.currentTime / this.player.duration) * 100
      );

      // Remove previous video
      this.player.removeAttribute('src');

      this.dbService
        .setEpisodeProgress(
          this.show['dashed_title'],
          this.episode['label'],
          playProgress
        )
        .subscribe(show => { });
    }

    if (this.nextEpisode) {
      delete this.nextEpisode;
    }

    if (this.server) {
      this.server.close();
    }
  }

  init() {
    // console.log(this.route.snapshot.params);
    this.dbService.getShow(this.route.snapshot.params.show).subscribe(show => {
      this.show = show;
      // console.log('Show ->', show);
      this.dbService
        .getEpisode(
          this.route.snapshot.params.show,
          this.route.snapshot.params.episode
        )
        .subscribe(episode => {
          this.episode = episode;
          // console.log('Episode ->', episode);
          this.checkVideoPath().subscribe(filePath => {
            this.filePath = filePath;
            this.setup();
          });
        });
    });
  }

  setup() {
    // console.log('SETUP');

    const document: any = window.document;
    const that = this;

    this.fetchProgress();

    this.player = document.getElementById('player');

    // this.player.setAttribute('src', this.filePath);

    this.keyBindingsSetup();

    // Download or load subs
    console.log('Local subs', this.subtitlesPaths);
    if (this.subtitlesPaths.length === 0) {
      this.downloadSubs();
    } else {
      this.subtitlesPaths.forEach(sPath => {
        this.addSubs(sPath);
      })
    }

    this.loading = false;

    // Setup default subs
    const track = document.createElement('track');
    track.kind = 'captions';
    track.label = 'English';
    track.srclang = 'en';
    track.label = '[ Disable ]';
    this.player.appendChild(track);

    document.addEventListener(
      'mousemove',
      () => {
        that.lastMove = Date.now();
      },
      false
    );

    document.addEventListener(
      'dragenter',
      e => {
        e.stopPropagation();
        e.preventDefault();
      },
      false
    );

    document.addEventListener(
      'dragover',
      e => {
        e.stopPropagation();
        e.preventDefault();
      },
      false
    );

    document.addEventListener('drop', e => {
      e.stopPropagation();
      e.preventDefault();
      const dt = e.dataTransfer;
      const files = dt.files;
      console.log('Subs dropped:', files[0]);
      // const fileName = this.path.join(this.path.dirname(this.filePath), files[0].name);
      // this.fsExtra.writeFileSync(fileName, files[0]);
      that.addSubs(files[0].path);
    }, false);

    let firstSetup = true;

    that.player.addEventListener('loadeddata', () => {
      // console.log('that.player.readyState', that.player.readyState);
      if (that.player && that.player.readyState === 4) {
        const duration = +that.player.duration;
        const minutes =
          Math.floor(duration / 60).toString().length === 1
            ? '0' + Math.floor(duration / 60).toString()
            : Math.floor(duration / 60).toString();
        const seconds =
          Math.floor(that.player.duration % 60).toString().length === 1
            ? '0' + Math.floor(duration % 60).toString()
            : Math.floor(duration % 60).toString();
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
      const filePath = this.path.join(
        this.app.getPath('downloads'),
        'Cereal',
        this.torrentService.getCleanTitle(this.show['title']),
        this.episode['label']
      );
      const filesCheckInterval = setInterval(() => {
        // console.log('Check files', filePath, that.fs.existsSync(filePath));
        if (this.fs.existsSync(filePath)) {
          let files = this.fs.readdirSync(filePath);
          let resolvedFilePath = '';
          files.forEach(file => {
            let ext = file.substring(file.length - 3, file.length);
            if (ext === 'mkv' || ext === 'mp4' || ext === 'avi') {
              this.filePath = this.path.join(filePath, file);
              clearInterval(filesCheckInterval);
              resolvedFilePath = this.filePath;
              // console.log('Video found ->', this.filePath);
            }

            if (ext === 'srt') { this.subtitlesPaths.push(this.path.join(filePath, file)); }

            if (this.fs.statSync(this.path.join(filePath, file)).isDirectory()) {
              files = this.fs.readdirSync(this.path.join(filePath, file));
              files.forEach(file2 => {
                ext = file2.substring(file2.length - 3, file2.length);
                if (ext === 'mkv' || ext === 'mp4') {
                  this.filePath = this.path.join(filePath, file, file2);
                  resolvedFilePath = this.filePath;
                  clearInterval(filesCheckInterval);
                  // console.log('Video found ->', this.filePath);
                }

                if (ext === 'srt') { this.subtitlesPaths.push(this.path.join(filePath, file, file2)); }

              });
            }
          });
          observer.next(resolvedFilePath);
        }
      }, 1000);
    });
  }

  // Subtitles
  downloadSubs() {
    // Add subs tracks
    console.log('Downloading subtitles');
    let fileName = this.path.basename(this.filePath);
    fileName = fileName.substring(0, fileName.length - 4);
    const dn = this.dn ? this.dn : fileName;
    this.subsService
      .retrieveSubs(this.show, this.episode['label'], dn)
      .subscribe(subs => {
        subs.forEach(sub => {
          this.subsService
            .downloadSub(sub, this.filePath)
            .subscribe(subPath => {
              // console.log('subPath', subPath);
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
      console.log('Creating vtt', filePath);
      that.fsExtra
        .createReadStream(filePath)
        .pipe(that.srt2vtt())
        .pipe(that.fsExtra.createWriteStream(
          filePath.substring(0, filePath.length - 3) + 'vtt'
        ));

      track.src = filePath.substring(0, filePath.length - 3) + 'vtt';
      track.label = that.path.normalize(track.src).split(that.path.sep)[
        that.path.normalize(track.src).split(that.path.sep).length - 1
      ];
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
      // if (that.player.textTracks['1']) {
      //   that.player.textTracks['1'].mode = 'showing';
      // }

      if (!duplicate) {
        that.player.appendChild(track);
      }

      setTimeout(() => {
        this.selectSubs(0);
      }, 500);

    } else {
      console.log('Cannot access file:', filePath);
    }
  }

  formatCues(index?: number) {
    index = index ? index : 0;
    console.log('formatCues', index);
    setTimeout(() => {
      if (this.player && this.player.textTracks) {
        const track = this.player.textTracks[index];
        const cues = track.cues;
        if (cues) {
          Object.keys(cues).forEach(key => {
            cues[key].snapToLines = false;
            cues[key].line = 90;
          });
        }
        for (const key in this.player.textTracks) {
          if (this.player.textTracks.hasOwnProperty(key)) {
            this.player.textTracks[key].mode = 'hidden';
          }
        }
        if (this.player.textTracks[index]) {
          this.player.textTracks[index].mode = 'showing';
        }
      }
    }, 10);
  }

  toggleSubs() {
    this.showSubs = !this.showSubs;
  }

  selectSubs(i) {
    for (const key in this.player.textTracks) {
      if (this.player.textTracks.hasOwnProperty(key)) {
        const element = this.player.textTracks[key];
        element.mode = 'hidden';
        if (element.label === this.player.textTracks[i].label) {
          element.mode = 'showing';
          this.formatCues(i);
        }
      }
    }
    setTimeout(() => {
      this.showSubs = false;
    }, 100);
  }

  keyBindingsSetup() {
    document.body.onkeyup = e => {
      // Space: toggle play
      if (e.keyCode === 32) { this.toggle_play(); }
    };
    document.body.onkeydown = e => {
      // Right arrow: forward 1 sec
      if (e.keyCode === 39) { this.player.currentTime = this.player.currentTime + 1; }
      // Left arrow: backward 1 sec
      if (e.keyCode === 37) { this.player.currentTime = this.player.currentTime - 1; }
    };
    // Double click: toggle fullscreen
    document.getElementById('player').addEventListener('dblclick', () => {
      this.toggle_fullscreen();
    });
  }

  timelineSetup() {
    const video = document.getElementsByTagName('video')[0];
    const timeline: HTMLInputElement = document.getElementById(
      'timeline'
    ) as HTMLInputElement;

    video.play();

    timeline.addEventListener('change', () => {
      // Calculate the new time
      const value: number = parseInt(timeline.value, 10);
      const time = video.duration * (value / 100);
      // Update the video time
      video.currentTime = time;
    });

    if (this.episode['play_progress']) {
      console.log('Restoring playback progress', this.episode['play_progress']);
      timeline.value = this.episode['play_progress'];
      this.player.currentTime = this.episode['play_progress']
        ? (this.player.duration / 100) * this.episode['play_progress']
        : 0;
    }
  }


  // Controls
  controlsLoop() {
    const that = this;
    // const video = document.getElementsByTagName('video')[0];
    const timeline: HTMLInputElement = document.getElementById(
      'timeline'
    ) as HTMLInputElement;
    let pressed = false;

    timeline.addEventListener('mousedown', () => {
      pressed = true;
    });
    timeline.addEventListener('mouseup', () => {
      pressed = false;
    });

    this.loopInterval = setInterval(() => {
      const currentTime = +that.player.currentTime;
      const totalTime = +that.player.duration;
      const minutes = Math.floor(currentTime / 60).toString().length === 1
        ? '0' + Math.floor(currentTime / 60).toString()
        : Math.floor(currentTime / 60).toString();
      const seconds = Math.floor(that.player.currentTime % 60).toString().length === 1
        ? '0' + Math.floor(currentTime % 60).toString()
        : Math.floor(currentTime % 60).toString();

      that.currentTime = minutes + ':' + seconds;
      that.idleTime = Math.floor(Date.now() / 100) - Math.floor(that.lastMove / 100);


      const value: number = Math.floor(currentTime / totalTime * 100);

      if (!pressed) { timeline.value = '' + value; }

    }, 100);
  }

  hideControls() {
    const hide = (this.idleTime > 30 && !this.showSubs);
    document.body.style.cursor = hide ? 'none' : 'auto';
    return hide;
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

  openFolder() {
    this.shell.openItem(this.filePath);
  }

  isCurrent_episode(epLabel) {
    return epLabel === this.episode['label'];
  }

  fetchProgress() {
    this.progressSubscription = interval(500).subscribe(() => {
      if (this.episode && this.episode['status'] === 'pending') {
        const t = this.torrentService.getTorrentByHash(
          this.episode['infoHash']
        );
        if (t) {
          // console.log('fetchProgress', t.infoHash, t.progress, t.downloadSpeed);

          if (t['progress'] !== 1) {
            this.speed = (Math.round((t['downloadSpeed'] / 1048576) * 100) / 100).toString();
            this.progress = t['progress'] * 100;
            if (this.progress > 10 && !this.player.getAttribute('src')) {
              t.files.forEach((file, i) => {
                if (file.path.endsWith('mkv') || file.path.endsWith('mp4')) {
                  // create HTTP server for this torrent
                  if (this.server) {
                    this.server.close();
                  }
                  this.server = t.createServer();
                  this.server.listen(3333); // start the server listening to a port
                  this.player.setAttribute('src', 'http://localhost:3333/' + i + '/' + file.path);
                  console.log('Server src', 'http://localhost:3333/' + i + '/' + file.path);
                }
              });
              // this.player.setAttribute('src', this.filePath);
            }
            this.cdRef.detectChanges();
          } else {
            this.progress = 100;
            delete this.speed;
            if (!this.player.getAttribute('src')) {
              this.player.setAttribute('src', this.filePath);
              this.progressSubscription.unsubscribe();
              this.downloadNext();
            }
          }
        }
      }
      if (this.episode && this.episode['status'] === 'ready') {
        this.progress = 100;
        delete this.speed;
        if (!this.player.getAttribute('src')) {
          this.player.setAttribute('src', this.filePath);
        }
        this.downloadNext();
        this.progressSubscription.unsubscribe();
      }
    });
  }

  playNextEpisode() {
    this.loading = true;
    this.router.navigate([
      'play',
      { show: this.show['dashed_title'], episode: this.nextEpisode['label'] }
    ]);
  }

  downloadNext() {
    // console.log('Preparing next episode download..');
    const currentSeasonIndex = parseInt(this.episode['label'].split('E')[0].substring(1, 3), 10);
    const currentSeason = this.show['Seasons'][currentSeasonIndex];
    currentSeason.forEach((ep, index) => {
      if (ep['label'] === this.episode['label'] && index < currentSeason.length - 1) {
        console.log('Current episode has next:', ep);
        this.nextEpisode = currentSeason[index + 1];
      }
    });

    if (!this.nextEpisode || moment(this.nextEpisode.date, 'YYYY-MM-DD').diff(moment(), 'days') > 1) {
      delete this.nextEpisode;
      console.log('This is the last episode available');
      return;
    }
    if (this.nextEpisode && this.nextEpisode.status === 'ready' || this.nextEpisode.status === 'pending') {
      return;
    }

    this.scrapingService
      .retrieveEpisode(this.show['title'], this.nextEpisode['label'])
      .subscribe(scrapedEpisode => {
        // console.log('scrapedEpisode', scrapedEpisode);
        if (!this.nextEpisode['magnetURI']) {
          this.nextEpisode['magnetURI'] = scrapedEpisode['magnetURI'];
        }
        this.nextEpisode['dn'] = scrapedEpisode.dn;
        this.nextEpisode['infoHash'] = magnet.decode(
          this.nextEpisode['magnetURI']
        )['infoHash'];

        // Add torrent to WT client
        this.torrentService
          .addTorrent({
            magnetURI: this.nextEpisode['magnetURI'],
            title: this.show['title'],
            episode_label: this.nextEpisode['label']
          })
          .subscribe();
        // Add episode torrent to torrents & shows DB
        this.dbService
          .addTorrent({
            dn: this.nextEpisode['dn'],
            infoHash: this.nextEpisode['infoHash'],
            magnetURI: this.nextEpisode['magnetURI'],
            dashed_title: this.show['dashed_title'],
            title: this.show['title'],
            episode_label: this.nextEpisode['label'],
            status: 'pending',
            date: this.nextEpisode['date']
          })
          .subscribe(show => {
            console.log('Next episode', this.nextEpisode['label'], 'downloading');
          });
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
