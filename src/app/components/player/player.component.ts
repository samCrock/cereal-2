import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { DbService, SubsService, ScrapingService, TorrentService } from '../../services';
import * as moment from 'moment';
import { ElectronService } from 'ngx-electron';
import * as magnet from 'magnet-uri';
import { Router } from '@angular/router';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
  providers: [TorrentService]

})
export class PlayerComponent implements OnChanges, OnInit {

  private show: Object;
  private episode: Object;
  private file_path: string;

  // private path = this.electronService.remote.getGlobal('path');
  private shell = this.electronService.remote.getGlobal('shell');
  private loading = true;
  private path = this.electronService.remote.getGlobal('path');
  private fs = this.electronService.remote.getGlobal('fs');

  private isPlaying = true;
  private isFullscreen = false;
  private currentTime = '0:00';
  private totalTime = '0:00';
  private player;

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

    console.log('ngOnInit');
    console.log(this.show);
    console.log(this.episode);
    console.log(this.file_path);

    this.fs.readdir(this.file_path, (err, files) => {
      if (files) {
        files.forEach(file => {
          const ext = file.substring(file.length - 3, file.length);
          if (ext === 'mkv' || ext === 'mp4') {
            console.log(ext);
            this.file_path = this.path.join(this.file_path, file);
          }
        });
      }
      this.setup();
    });

    ////////
    const that = this;
    document.body.onkeyup = function(e) {
      // SPACE
      if (e.keyCode === 32) {
        that.toggle_play();
      }
    };
    document.getElementById('player')
    .addEventListener('dblclick', function() {
      that.toggle_fullscreen();
    });
    ////////

  }

  setup() {
    this.player = document.getElementById('player');
    console.log('File path', this.file_path);
    this.player.setAttribute('src', this.file_path);
  }

  toggle_play() {
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


}
