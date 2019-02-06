import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ElectronService } from 'ngx-electron';

@Injectable()
export class TorrentService {

  private wt_client = this._electronService.remote.getGlobal('wt_client');
  private local_path = this._electronService.remote.getGlobal('local_path');

  constructor(private _electronService: ElectronService) { }

  addTorrent(episode_torrent: Object): Observable<number> {
    return new Observable(observer => {
      console.log('Adding torrent', episode_torrent);

      if (!this.wt_client.get(episode_torrent['magnetURI'])) {
        console.log('Adding torrent', episode_torrent);
        this.wt_client.add(episode_torrent['magnetURI'], {
          path: this.local_path + '\\Downloads\\Cereal\\' + episode_torrent['show'] + '\\' + episode_torrent['episode']
        });
        this.wt_client.get(episode_torrent['magnetURI']).on('ready', function() {
          observer.next(1);
        });
      } else {
        console.log('Already here');
        observer.next(0);
      }
    });
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
          // console.error('gettorrent', e);
        }
      });
    });
  }

  removeTorrent(magnetURI) {
    if (this.wt_client.get(magnetURI)) {
      this.wt_client.remove(magnetURI);
    }
  }


}
