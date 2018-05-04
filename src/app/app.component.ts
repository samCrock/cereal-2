import { Component, OnDestroy, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { TorrentService, DbService } from './services';

import { TranslateService } from '@ngx-translate/core';
import { AppConfig } from './app.config';
import { EventEmitter } from '@angular/core';
import { IntervalObservable } from "rxjs/observable/IntervalObservable";
import * as magnet from 'magnet-uri';


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
    private dbService: DbService
    ) {

    translate.setDefaultLang('en');

    this.alive = true;

  }

  ngOnDestroy(){
    this.alive = false;
  }

  ngOnInit() {

    IntervalObservable.create(1000)
    .takeWhile(() => this.alive)
    .subscribe(() => {


      let torrents = this.dbService.getPendingTorrents()
      .subscribe(torrents => {

        // if (torrents.length > 0) { console.log('Pending torrents', torrents); }

        torrents.forEach(torrent => {
          // console.log('Pending torrent', torrent);
          let _torrent = this.wt_client.get(torrent['magnet']);
          if (_torrent && _torrent.progress === 1) {
             console.log('Setting torrent to ready', _torrent);
            this.dbService.readyTorrent(_torrent.infoHash)
            .subscribe(ep => {
             console.log('Setting episode to ready', ep);
              this.dbService.readyEpisode(ep)
              .subscribe(show => {
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
