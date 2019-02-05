import { Component, Input, Output, OnChanges, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/forkJoin';
import { DbService, SubsService, ScrapingService, TorrentService } from '../../services';
import * as moment from 'moment';
import { ElectronService } from 'ngx-electron';
import { Router } from '@angular/router';
import * as magnet from 'magnet-uri';

@Component({
  selector: 'app-episode',
  templateUrl: './episode.component.html',
  styleUrls: ['./episode.component.scss'],
  providers: [DbService, ScrapingService, SubsService, TorrentService]

})
export class EpisodeComponent implements OnChanges {

  @Input() show: Object;
  @Input() episode: Object;
  @Input() format = 'extended';
  @Output() notify: EventEmitter<any> = new EventEmitter<any>();


  public path = this.electronService.remote.getGlobal('path');
  public shell = this.electronService.remote.getGlobal('shell');
  public app = this.electronService.remote.getGlobal('app');
  public fsExtra = this.electronService.remote.getGlobal('fsExtra');

  public expanded = false;
  public ep_torrents = [];
  public selectedTorrent;
  public titleAsButton = false;
  public loading: boolean;
  public hasResults: boolean;
  public currentTorrentsListSub;

  constructor(
    public dbService: DbService,
    public scrapingService: ScrapingService,
    public subsService: SubsService,
    public torrentService: TorrentService,
    public electronService: ElectronService,
    public router: Router
  ) {
  }

  ngOnChanges() {
    this.setup();
    // console.log(this.format);
  }

  setup(triggered?: boolean) {
    if (!this.show || triggered) {
      this.dbService.getShow(this.episode['dashed_title'])
        .subscribe(show => {
          this.show = show;
          console.log('this.show', this.show);
          console.log('this.episode', this.episode);
        });
    }
    if (this.episode['episode_label']) {
      this.episode['label'] = this.episode['episode_label'];
    }
    // console.log(this.router.url);
    if (this.router.url === '/torrents') {
      this.titleAsButton = true;
    }
    // console.log('Episode:', this.episode);
  }

  formatDate(date) {
    if (date) {
      return moment(date, 'YYYY-MM-DD').fromNow();
    }
    if (!date) {
      return 'No air date';
    }
  }

  downloadable(air_date) {
    return moment(air_date, 'YYYY-MM-DD').diff(moment(), 'hours') < 24;
  }

  getTorrentProgress(episode): Observable<any> {
    if (episode) {
      const s = episode['label'].substring(1, 3),
        e = episode['label'].substring(4, 6);
      if (this.show['Seasons'][Number(s)]) {
        if (this.show['Seasons'][Number(s)][Number(e) - 1] && this.show['Seasons'][Number(s)][Number(e) - 1].status === 'ready') {
          return Observable.of(100);
        }
        if (!this.show['Seasons'][Number(s)][Number(e) - 1]) {
          return;
        } else {
          return this.dbService.getTorrentProgress(this.show['Seasons'][Number(s)][Number(e) - 1].infoHash);
        }
      }
    }
  }

  getTorrentDownloadSpeed(episode): Observable<any> {
    if (episode) {
      const s = episode['label'].substring(1, 3),
        e = episode['label'].substring(4, 6);
      if (this.show['Seasons'][Number(s)]) {
        if (this.show['Seasons'][Number(s)][Number(e) - 1] && this.show['Seasons'][Number(s)][Number(e) - 1].status === 'ready') {
          return Observable.of(true);
        } else {
          if (!this.show['Seasons'][Number(s)][Number(e) - 1]) {
            return;
          } else {
            return this.dbService.getTorrentDownloadSpeed(this.show['Seasons'][Number(s)][Number(e) - 1].infoHash);
          }
        }
      }
    }
  }

  download_episode(episode) {
    this.loading = true;
    // Retrieve episode from db
    let result;
    this.dbService.getEpisode(this.show['dashed_title'], episode['label'])
    .subscribe( dbEpisode => {
      // console.log('dbEpisode', dbEpisode);
      result = dbEpisode;
      this.scrapingService.retrieveEpisode(this.show['title'], episode['label'])
      .subscribe(scrapedEpisode => {
        if (!scrapedEpisode) {
          return this.loading = false;
        }
        // console.log('scrapedEpisode', scrapedEpisode);
        if (!result.magnetURI) {
          result.magnetURI = scrapedEpisode.magnetURI;
          result.dn = scrapedEpisode.dn;
        }

        // Set infohash
        result.infoHash = magnet.decode(result['magnetURI']).infoHash;

        // Finalize
        this.torrentService.addTorrent({
          magnetURI: result['magnetURI'],
          infoHash: result.infoHash,
          show: this.show['title'],
          episode: result.label,
          dn: result.dn,
          date: episode['date']
        }).subscribe();
        this.dbService.addTorrent({
          dn: result['dn'],
          infoHash: result.infoHash,
          magnetURI: result.magnetURI,
          dashed_title: this.show['dashed_title'],
          title: this.show['title'],
          episode_label: result.label,
          status: 'pending',
          date: result.date
        }).subscribe(show => {
          // console.log('Updated show', show);
          this.show = show;
        });

      });
    });




  }

  async download() {

  }

  play(episode, dn) {
    this.loading = false;
    this.dbService.getShow(this.show['dashed_title'])
      .subscribe(show => {
        this.show = show;
        const s = episode['label'].substring(1, 3),
          e = episode['label'].substring(4, 6),
          fresh_ep = this.show['Seasons'][Number(s)][Number(e) - 1],
          path = this.path.join(this.app.getPath('downloads'), 'Cereal', this.show['title'], fresh_ep['label']
            // this.fsExtra.readdirSync(this.path.join(this.app.getPath('downloads'), 'Cereal', this.show['title'], fresh_ep['label']))[0]
          );

        // let video_path = path;
        // const that = this;
        // const files = this.fsExtra.readdirSync(path);
        // files.map(file => {
        //   const stats = that.fsExtra.statSync(that.path.join(path, file));
        //     if (stats.isDirectory()) {
        //       video_path = that.path.join(path, file);
        //       console.log('video path', video_path);
        //     }
        // });

        localStorage.setItem('play', JSON.stringify({
          show: this.show,
          episode: episode,
          // file_path: video_path,
          dn: dn
        }));
        if (this.format === 'extended') {
          this.router.navigate(['play']);
        } else {
          // this.router.navigate(['play']);
          this.notify.emit(episode);
        }
      });
  }

  isCurrent() {
    let isCurrent = false;
    let current = localStorage.getItem('play');
    if (current) {
      current = JSON.parse(current);
      if (current['show']['dashed_title'] === this.show['dashed_title'] && current['episode']['label'] === this.episode['label']) {
        isCurrent = true;
      }
    }
    return isCurrent;
  }

  toggleExtra(episode) {
    this.expanded = !this.expanded;
    if (this.expanded) {
      this.retrieveTorrentsList(episode);
    } else {
      this.ep_torrents = [];
    }
  }

  retrieveTorrentsList(episode): Observable<any> {
    this.loading = true;
    this.currentTorrentsListSub = this.scrapingService.retrieveTorrentsList(this.show['dashed_title'], episode.label)
      .subscribe(result => {
        if (result) {
          this.hasResults = true;
          this.loading = false;
          this.ep_torrents.push(result);
        } else {
          this.loading = false;
          this.hasResults = false;
        }
      });
    return this.currentTorrentsListSub;
  }

  onTorrentChange(episode, t) {
    this.selectedTorrent = t;
    this.dbService.setEpisode({
      dashed_title: this.show['dashed_title'],
      label: episode['label'],
      dn: t.name,
      magnetURI: t.magnetURI
    }).subscribe(_t => {
      console.log('Episode torrent changed:', _t);
    });
  }

  deleteTorrent(episode) {
    episode['dashed_title'] = this.show['dashed_title'];
    episode['episode_label'] = episode['label'];
    console.log('deleteTorrent', episode);

    this.notify.emit(episode);

    // delete from torrent client
    this.torrentService.removeTorrent(episode.infoHash);

    // delete from db shows
    this.dbService.deleteTorrent(episode.infoHash).subscribe();

    // delete from db torrent
    this.dbService.deleteEpisode(episode).subscribe(() => {
      this.setup(true);
    });

    // delete files
    const folder_path = this.path.join(this.app.getPath('downloads'), 'Cereal', this.show['title'], episode['episode_label']);
    this.fsExtra.remove(folder_path, err => {
      if (err) {
        console.log('Deleting files:', folder_path, err);
      }
    });
  }


}
