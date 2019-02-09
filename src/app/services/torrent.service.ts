import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ElectronService } from 'ngx-electron';
import { WtService } from './wt.service';

@Injectable()
export class TorrentService {

  private wt_client;
  private local_path = this._electronService.remote.getGlobal('local_path');

  constructor(private _electronService: ElectronService, private wtService: WtService) {
    this.wtService.getClient()
      .subscribe(c => {
        console.log('Torrent service got a fresh webtorrent client!');
        this.wt_client = c;
      });
  }

  addTorrent(episode_torrent: Object): Observable<any> {
    return new Observable(observer => {
      if (!this.wt_client.get(episode_torrent['magnetURI'])) {
        console.log('Adding torrent', episode_torrent);
        this.wt_client.add(episode_torrent['magnetURI'], {
          path: this.local_path + '\\Downloads\\Cereal\\' + episode_torrent['title'] + '\\' + episode_torrent['episode_label']
        }, function (torrent) {
          observer.next(torrent);
        });
      } else {
        observer.next();
      }
    });
  }

  getTorrentByHash(infoHash) {
    return this.wt_client.get(infoHash);
  }

  getTorrent(infoHash): Observable<any> {
    return new Observable(observer => {
      this.wt_client.torrents.forEach(t => {
        try {
          if (!t || !t['infoHash']) { return observer.next(); }
          if (t['infoHash'] === infoHash) {
            return observer.next(t);
          }
        } catch (e) {
          console.error('getTorrent', e);
        }
      });
      observer.next();
    });
  }

  removeTorrent(magnetURI) {
    return new Observable(observer => {
      if (this.wt_client.get(magnetURI)) {
        this.wt_client.remove(magnetURI, error => {
          if (!error) {
            observer.next('Done');
          } else {
            console.error(error);
            throw new Error(error);
          }
        });
      } else {
        observer.next('No results');
      }
      this.wtService.restartClient();
    });
  }


}
