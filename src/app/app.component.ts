import { Component, OnDestroy, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { DbService, TorrentService } from './services';
import { TranslateService } from '@ngx-translate/core';
import * as Materialize from 'materialize-css';
import { HttpClient, HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [HttpClient]
})
export class AppComponent implements OnInit, OnDestroy {

  private wt_client = this._electronService.remote.getGlobal('wt_client');
  public fs = this._electronService.remote.getGlobal('fs');
  public app = this._electronService.remote.getGlobal('app');
  public path = this._electronService.remote.getGlobal('path');
  public alive: boolean;
  private update = this._electronService.remote.getGlobal('update');
  public updateProgress: number;
  public updateReady: boolean;

  constructor(
    public translate: TranslateService,
    private _electronService: ElectronService,
    private torrentService: TorrentService,
    private dbService: DbService,
    private http: HttpClient
  ) {
    window['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;
    translate.setDefaultLang('en');
    this.alive = true;
  }

  ngOnDestroy() {
    this.alive = false;
  }

  ngOnInit() {
    if (this.update) {
      Materialize.toast({
        html: 'There\'s a new version of Cereal',
        displayLength: 2000,
        inDuration: 600,
        outDuration: 400,
        classes: ''
      });
      console.log('A new version is ready to download..');
      this.http.get('https://github.com/samCrock/cereal-2/raw/win-build/Cereal_Setup.exe',
        { responseType: 'arraybuffer', reportProgress: true, observe: 'events' }).subscribe((event: any) => {
          if (event.type === HttpEventType.DownloadProgress) {
            this.updateProgress = Math.round(event['loaded'] / event['total'] * 100);
          }
          if (event.body) {
            const installer_path = this.path.join(this.app.getPath('appData'), 'Cereal', 'Update_installer.exe');
            console.log('File is ready:', installer_path);

            this.fs.appendFileSync(installer_path, new Buffer(event.body));

            this.updateReady = true;
            delete this.updateProgress;
            Materialize.toast({
              html: 'The new version is now ready. Restart Cereal to upgrade!',
              displayLength: 2000,
              inDuration: 600,
              outDuration: 400,
              classes: ''
            });
          }
        });
    }

    // Restore pending torrents
    setTimeout(() => {
      this.dbService.getPendingTorrents()
        .subscribe(_torrents => {
          _torrents.forEach(torrent => {
            const _torrent = this.wt_client.get(torrent['magnetURI']);
            if (_torrent && _torrent.progress === 1) {
              this.dbService.readyTorrent(_torrent.infoHash)
                .subscribe(ep => {
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
            this.torrentService.addTorrent(torrent).subscribe();
          });
        });
    }, 2000);

  }

  onActivate(event) {
    window.scroll(0, 0);
  }

}
