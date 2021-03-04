import { Component, OnDestroy, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { DbService, TorrentService, WtService } from './services';
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

  public fs = this.electronService.remote.getGlobal('fs');
  public app = this.electronService.remote.getGlobal('app');
  public path = this.electronService.remote.getGlobal('path');
  public alive: boolean;
  private update = this.electronService.remote.getGlobal('update');
  public updateProgress: number;
  public updateReady: boolean;
  public wtClient: any;

  constructor(
    public translate: TranslateService,
    private electronService: ElectronService,
    private torrentService: TorrentService,
    private dbService: DbService,
    private wtService: WtService,
    private http: HttpClient
  ) {
    window['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;
    translate.setDefaultLang('en');
    this.alive = true;

    this.wtService.getClient().subscribe(c => {
      console.log('Fresh webtorrent client!');
      this.wtClient = c;
    });

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
            const installerPath = this.path.join(this.app.getPath('appData'), 'Cereal', 'Update_installer.exe');
            console.log('File is ready:', installerPath);

            this.fs.appendFileSync(installerPath, Buffer.from(event.body));

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
      this.dbService.getTorrents()
        .subscribe(_torrents => {
          _torrents.forEach(torrent => {
            // console.log(torrent.dn, torrent.status);
            if (torrent.status !== 'ready') {
              this.torrentService.addTorrent(torrent)
                .subscribe(t => {
                  if (!t) { return; }

                  if (t.progress === 1) {
                    this.ready(torrent);
                  }
                  t.on('ready', function () {
                    this.ready(torrent);
                  });

                  // t.on('download', function () {
                  //   console.log(t.infoHash, t.progress);
                  // });
                });
            }
          });
        });

      // this.wtClient.torrents.forEach(t => {
      //   console.log('WT torrent ->', t.infoHash, t.progress);
      // });
    }, 1000);

  }

  ready(torrent) {
    this.dbService.readyEpisode(torrent).subscribe(() => {
      Materialize.toast({
        html: torrent['dn'] + ' is ready',
        displayLength: 2000,
        inDuration: 600,
        outDuration: 400,
        classes: ''
      });
    });
    this.dbService.readyTorrent(torrent['infoHash']).subscribe();
  }

  onActivate(event) {
    window.scroll(0, 0);
  }


}
