import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { TorrentService, DbService } from './services';

import { TranslateService } from '@ngx-translate/core';
import { AppConfig } from './app.config';
import { EventEmitter } from '@angular/core';
import { IntervalObservable } from 'rxjs/observable/IntervalObservable';
import * as magnet from 'magnet-uri';
import { Router, NavigationEnd } from '@angular/router';
import * as Materialize from 'materialize-css';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  private wt_client = this._electronService.remote.getGlobal('wt_client');
  private ready: EventEmitter<any> = new EventEmitter();
  private alive: boolean;

  constructor(
    public electronService: ElectronService,
    private translate: TranslateService,
    private _electronService: ElectronService,
    private torrentService: TorrentService,
    private dbService: DbService,
    private router: Router
    ) {
    window['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;
    translate.setDefaultLang('en');
    this.alive = true;
  }

  ngOnDestroy() {
    this.alive = false;
  }

  ngOnInit() {
    IntervalObservable.create(1000)
    .subscribe(() => {

      const torrents = this.dbService.getPendingTorrents()
      .subscribe(_torrents => {
            // if (torrents.length > 0) { console.log('Pending torrents', torrents); }
            _torrents.forEach(torrent => {
              // console.log('Pending torrent', torrent);
              const _torrent = this.wt_client.get(torrent['magnet']);
              if (_torrent && _torrent.progress === 1) {
                console.log('Setting torrent to ready', _torrent);
                this.dbService.readyTorrent(_torrent.infoHash)
                .subscribe(ep => {
                  console.log('Setting episode to ready', ep);
                  this.dbService.readyEpisode(ep)
                  .subscribe(show => {
                    Materialize.toast({
                      html: show['title'] + ' ' + ep['episode_label'] + ' is ready',
                      displayLength: 2000,
                      inDuration: 600,
                      outDuration: 400,
                      classes: ''
                    });
                    console.log('Episode set to ready!');
                  });
                });
              }
              this.torrentService.addTorrent(torrent);
            });
          });
    });
  }

}
