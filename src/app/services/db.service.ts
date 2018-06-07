import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/observable/of';
import { mergeMap, catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as cheerio from 'cheerio';
import * as moment from 'moment';
import { IntervalObservable } from 'rxjs/observable/IntervalObservable';
import { TorrentService } from './torrent.service';
import { ScrapingService } from './scraping.service';

@Injectable()
export class DbService {

  constructor(private torrentService: TorrentService) {
    let db;
    const request = window.indexedDB.open('CerealDB', 1);
    request.onerror = function(event) {};
    request.onupgradeneeded = function(event) {
      db = event.target['result'];
      console.log('onupgradeneeded', db);

      // Shows store
      const shows_objectStore = db.createObjectStore('shows', { keyPath: 'dashed_title' });
      shows_objectStore.createIndex('title', 'title', { unique: false });
      shows_objectStore.createIndex('infoHash', 'infoHash', { unique: true });
      shows_objectStore.transaction.oncomplete = function() {
        db['transaction']('shows', 'readwrite').objectStore('shows');
      };
      // Torrents store
      const torrents_objectStore = db.createObjectStore('torrents', { keyPath: 'infoHash' });
      torrents_objectStore.createIndex('episode', 'episode', { unique: false });
      torrents_objectStore.createIndex('show', 'show', { unique: false });
      torrents_objectStore.transaction.oncomplete = function() {
        db['transaction']('torrents', 'readwrite').objectStore('torrents');
      };
    };

  }

  private openDb() {
    return new Observable(observer => {
      let db;
      const request = window.indexedDB.open('CerealDB', 1);
      request.onerror = function(event) {};
      request.onupgradeneeded = function(event) {
        db = event.target['result'];
        console.log('onupgradeneeded', db);

        // Shows store
        const shows_objectStore = db.createObjectStore('shows', { keyPath: 'dashed_title' });
        shows_objectStore.createIndex('title', 'title', { unique: false });
        shows_objectStore.createIndex('infoHash', 'infoHash', { unique: true });
        shows_objectStore.transaction.oncomplete = function() {
          db['transaction']('shows', 'readwrite').objectStore('shows');
        };
        // Torrents store
        const torrents_objectStore = db.createObjectStore('torrents', { keyPath: 'infoHash' });
        torrents_objectStore.createIndex('episode', 'episode', { unique: false });
        torrents_objectStore.createIndex('show', 'show', { unique: false });
        torrents_objectStore.transaction.oncomplete = function() {
          db['transaction']('torrents', 'readwrite').objectStore('torrents');
        };
      };
      request.onsuccess = function(event) {
        console.log('onsuccess', event);
      };
      request.onsuccess = function(event) {
        return observer.next(event);
      };
    });
  }

  addShow(show) {
    this.openDb().subscribe(db => {
      db = event.target['result'];
      const objectStore = db['transaction'](['shows'], 'readwrite').objectStore('shows');
      const request = objectStore.add(show);
      request.onerror = function(event) {};
      request.onsuccess = function(event) { console.log('Show added'); };
    });
  }

  getShow(dashed_title): Observable < any > {
    return new Observable(observer => {
      this.openDb().subscribe(db => {
        db = event.target['result'];
        const objectStore = db['transaction'](['shows']).objectStore('shows');
        const request = objectStore.get(dashed_title);
        request.onerror = function(event) {
          return observer.error();
        };
        request.onsuccess = function(event) {
          if (request.result) {
            return observer.next(request.result);
          } else {
            return observer.error();
          }
        };
      });
    });
  }

  getLibrary(): Observable < any > {
    return new Observable(observer => {
      this.openDb().subscribe(db => {
        db = event.target['result'];
        const objectStore = db['transaction'](['shows']).objectStore('shows');
        const request = objectStore.getAll();
        request.onerror = function(event) {
          return observer.error();
        };
        request.onsuccess = function(event) {
          if (request.result) {
            return observer.next(request.result);
          } else {
            return observer.error();
          }
        };
      });
    });
  }

  addSeason(dashed_title, s_number, season) {
    return new Observable(observer => {
      this.openDb().subscribe(db => {
        db = event.target['result'];
        const objectStore = db['transaction'](['shows'], 'readwrite').objectStore('shows');
        const request = objectStore.get(dashed_title);
        request.oncomplete = function(event) { console.log('All done!'); };
        request.onerror = function(event) {};

        request.onsuccess = function(event) {
          if (request.result) {
            let Seasons = request.result.Seasons;
            if (!Seasons) { Seasons = {}; }
            Seasons[s_number] = season;
            request.result.Seasons = Seasons;
            const requestUpdate = objectStore.put(request.result);
            requestUpdate.onerror = function() {
              return observer.error();
            };
            requestUpdate.onsuccess = function() {
              return observer.next(request.result);
            };
          }
        };
      });
    });
  }

  addTorrent(episode_torrent) {
    return new Observable(observer => {
      this.openDb().subscribe(db => {
        db = event.target['result'];
        // Add to Torrents store
        const torrentObjectStore = db['transaction'](['torrents'], 'readwrite').objectStore('torrents');
        const torrentRequest = torrentObjectStore.add(episode_torrent);
        torrentRequest.onerror = function(event) {};
        torrentRequest.onsuccess = function(event) { console.log('Torrent added to torrents store'); };

        // Add to Shows store
        const objectStore = db['transaction'](['shows'], 'readwrite').objectStore('shows');
        const request = objectStore.get(episode_torrent['dashed_title']);
        request.onerror = function(event) {};
        request.onsuccess = function(event) {
          const season = episode_torrent['episode_label'].substring(1, 3),
            episode = episode_torrent['episode_label'].substring(4, 6);
          request.result['Seasons'][Number(season)][Number(episode) - 1].status = 'pending';
          request.result['Seasons'][Number(season)][Number(episode) - 1].infoHash = episode_torrent['infoHash'];
          request.result['Seasons'][Number(season)][Number(episode) - 1].dn = episode_torrent['dn'];
          request.result['Seasons'][Number(season)][Number(episode) - 1].date = episode_torrent['date'];
          request.result['updated'] = new Date;
          request.result['watching_season'] = Number(season);

          const requestUpdate = objectStore.put(request.result);
          requestUpdate.onerror = function() {};
          requestUpdate.onsuccess = function() {
            console.log('Torrent added to shows store');
            return observer.next(request.result);
          };
        };

      });
    });
  }

  getTorrent(infoHash) {
    return new Observable(observer => {
      this.openDb().subscribe(db => {
        db = event.target['result'];
        const objectStore = db['transaction'](['torrents'], 'readwrite').objectStore('torrents');
        const request = objectStore.get(infoHash);
        request.onerror = function(event) {
          return observer.error();
        };
        request.onsuccess = function(event) {
          if (request.result) {
            return observer.next(request.result);
          } else { return observer.next(); }
        };
      });
    });
  }

  deleteTorrent(infoHash) {
    return new Observable(observer => {
      this.openDb().subscribe(db => {
        db = event.target['result'];
        const objectStore = db['transaction'](['torrents'], 'readwrite').objectStore('torrents');
        const request = objectStore.delete(infoHash);
        request.onerror = function(event) {
          return observer.error();
        };
        request.onsuccess = function(event) {
          return observer.next();
        };
      });
    });
  }

  deleteEpisode(episode_torrent) {
    return new Observable(observer => {
      this.openDb().subscribe(db => {
        db = event.target['result'];
        const s_objectStore = db['transaction'](['shows'], 'readwrite').objectStore('shows');
        const s_request = s_objectStore.get(episode_torrent['dashed_title']);
        s_request.onerror = function(event) {};
        s_request.onsuccess = function(event) {

          const season = episode_torrent['episode_label'].substring(1, 3),
            episode = episode_torrent['episode_label'].substring(4, 6);
          delete s_request.result['Seasons'][Number(season)][Number(episode) - 1].status;
          delete s_request.result['Seasons'][Number(season)][Number(episode) - 1].infoHash;
          delete s_request.result['Seasons'][Number(season)][Number(episode) - 1].dn;

          const requestUpdate = s_objectStore.put(s_request.result);
          requestUpdate.onerror = function() {};
          requestUpdate.onsuccess = function() {
            console.log('Episode deleted');
            return observer.next();
          };
        };
      });
    });
  }

  getPendingTorrents(): Observable < any > {
    return new Observable(observer => {
      this.openDb().subscribe(db => {
        db = event.target['result'];
        const objectStore = db['transaction'](['torrents'], 'readwrite').objectStore('torrents');
        const request = objectStore.getAll();
        request.onerror = function(event) {};
        request.onsuccess = function(event) {
          const torrents = request.result,
            pending = [];
          if (torrents && torrents.length > 0) {
            torrents.forEach(t => {
              if (t['status'] === 'pending') {
                pending.push(t);
              }
            });
          }
          if (request.result) {
            return observer.next(pending);
          } else { return observer.error(); }
        };
      });
    });
  }

  getTorrents(): Observable < any > {
    return new Observable(observer => {
      this.openDb().subscribe(db => {
        db = event.target['result'];
        const objectStore = db['transaction'](['torrents'], 'readwrite').objectStore('torrents');
        const request = objectStore.getAll();
        request.onerror = function(event) {};
        request.onsuccess = function(event) {
          const torrents = request.result;
          if (request.result) {
            return observer.next(torrents);
          } else { return observer.error(); }
        };
      });
    });
  }


  readyTorrent(infoHash) {
    return new Observable(observer => {
      this.openDb().subscribe(db => {
        db = event.target['result'];
        const t_objectStore = db['transaction'](['torrents'], 'readwrite').objectStore('torrents');
        const t_request = t_objectStore.get(infoHash);
        t_request.onerror = function(event) {};
        t_request.onerror = function(event) {};
        t_request.onsuccess = function(event) {
          if (t_request.result) {
            t_request.result.status = 'ready';
            const requestUpdate = t_objectStore.put(t_request.result);
            requestUpdate.onerror = function() {
              return observer.error();
            };
            requestUpdate.onsuccess = function() {
              return observer.next(t_request.result);
            };
          }
        };
      });
    });
  }

  readyEpisode(episode_torrent) {
    return new Observable(observer => {
      this.openDb().subscribe(db => {
        db = event.target['result'];
        const s_objectStore = db['transaction'](['shows'], 'readwrite').objectStore('shows');
        const s_request = s_objectStore.get(episode_torrent['dashed_title']);
        s_request.onerror = function(event) {};
        s_request.onsuccess = function(event) {
          const season = episode_torrent['episode_label'].substring(1, 3),
            episode = episode_torrent['episode_label'].substring(4, 6);
          s_request.result['Seasons'][Number(season)][Number(episode) - 1].status = 'ready';
          s_request.result['Seasons'][Number(season)][Number(episode) - 1].infoHash = episode_torrent['infoHash'];
          s_request.result['Seasons'][Number(season)][Number(episode) - 1].dn = episode_torrent['dn'];

          const requestUpdate = s_objectStore.put(s_request.result);
          requestUpdate.onerror = function() {};
          requestUpdate.onsuccess = function() {
            console.log('Torrent is ready');
            return observer.next(s_request.result);
          };
        };
      });
    });
  }

  getTorrentProgress(infoHash): Observable < any > {
    return new Observable(observer => {
      const sub = this.torrentService.getTorrent(infoHash);
      sub.subscribe(t => {
        return observer.next(Math.round(t['progress'] * 100));
      });
    });
  }

  getTorrentDownloadSpeed(infoHash): Observable < any > {
    return new Observable(observer => {
      const sub = this.torrentService.getTorrent(infoHash);
      sub.subscribe(t => {
        if (t.progress === 1) {
          return observer.next(true);
        } else {
          return observer.next((Math.round(t['downloadSpeed'] / 1048576 * 100) / 100).toString());
        }
      });
    });
  }


  // Used to navigate seasons in show component
  setLastSeen(show, episode) {

  }

  // Used to set view progress on player exit
  setEpisodeViewProgress(show, episode, progress) {

  }

  // Used to set progress in episode component
  getEpisodeViewProgress(show, episode, progress) {

  }

}
