import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ElectronService } from 'ngx-electron';
import { WtService } from './wt.service';

@Injectable()
export class TorrentService {

  public path = this.electronService.remote.getGlobal('path');

  private wtClient;
  public app = this.electronService.remote.getGlobal('app');

  constructor(private electronService: ElectronService, private wtService: WtService) {
    this.wtService.getClient()
      .subscribe(c => {
        this.wtClient = c;
      });
  }

  getCleanTitle(title) {
    return title.replace(':', '');
  }

  addTorrent(episode): Observable<any> {
    return new Observable(observer => {
      if (!episode.dn) {
        observer.next();
      }
      if (!this.wtClient.get(episode['magnetURI'])) {
        const filePath = this.path.join(this.app.getPath('downloads'), 'Cereal',
          this.getCleanTitle(episode['title']), episode['episode_label']);
        console.log('Adding torrent', episode, filePath);
        this.wtClient.add(episode['magnetURI'], {
          path: filePath
        }, (torrent) => {
          torrent.on('ready', function () {
            this.dbService.readyTorrent(torrent['infoHash']).subscribe();
          });
          observer.next(torrent);
        });
      } else {
        observer.next();
      }
    });
  }

  getTorrentByHash(infoHash) {
    return this.wtClient.get(infoHash);
  }

  getTorrent(infoHash): Observable<any> {
    return new Observable(observer => {
      this.wtClient.torrents.forEach(t => {
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
      if (this.wtClient.get(magnetURI)) {
        this.wtClient.remove(magnetURI, error => {
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
    });
  }


}
