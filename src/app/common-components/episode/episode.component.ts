import { Component, Input, Output, OnChanges, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { DbService, SubsService, ScrapingService, TorrentService } from '../../services';
import * as moment from 'moment';
import { ElectronService } from 'ngx-electron';
import * as magnet from 'magnet-uri';
import { Router } from '@angular/router';

@Component({
  selector: 'app-episode',
  templateUrl: './episode.component.html',
  styleUrls: ['./episode.component.scss'],
  providers: [DbService, ScrapingService, SubsService, TorrentService]

})
export class EpisodeComponent implements OnChanges {

  @Input() show: Object;
  @Input() episode: Object;
  @Output() emit = new EventEmitter<any>();


  public path = this.electronService.remote.getGlobal('path');
  public shell = this.electronService.remote.getGlobal('shell');
  public app = this.electronService.remote.getGlobal('app');
  public fs = this.electronService.remote.getGlobal('fs');

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
  ) { }

  ngOnChanges() {
    this.setup();
  }

  setup(triggered?: boolean) {
    if (!this.show || triggered) {
      this.dbService.getShow(this.episode['dashed_title'])
        .subscribe(show => {
          this.show = show;
          // console.log('this.show', this.show);
        });
    }
    if (this.episode['episode_label']) { this.episode['label'] = this.episode['episode_label']; }
    // console.log(this.router.url);
    if (this.router.url === '/torrents') {
      this.titleAsButton = true;
    }
    // console.log('Episode:', this.episode);
  }

  formatDate(date) {
    if (date) { return moment(date, 'YYYY-MM-DD').fromNow(); }
    if (!date) { return 'No air date'; }
  }

  downloadable(air_date) {
    return moment(air_date, 'YYYY-MM-DD').diff(moment(), 'hours') < 24;
  }

  getTorrentProgress(episode): Observable<any> {
    const s = episode['label'].substring(1, 3),
      e = episode['label'].substring(4, 6);
    if (this.show['Seasons'][Number(s)]) {
      if (this.show['Seasons'][Number(s)][Number(e) - 1].status === 'ready') {
        return Observable.of(100);
      }
      return this.dbService.getTorrentProgress(this.show['Seasons'][Number(s)][Number(e) - 1].infoHash);
    }
  }

  getTorrentDownloadSpeed(episode): Observable<any> {
    const s = episode['label'].substring(1, 3),
      e = episode['label'].substring(4, 6);
    if (this.show['Seasons'][Number(s)]) {
      if (this.show['Seasons'][Number(s)][Number(e) - 1].status === 'ready') {
        return Observable.of(true);
      } else {
        return this.dbService.getTorrentDownloadSpeed(this.show['Seasons'][Number(s)][Number(e) - 1].infoHash);
      }
    }
  }

  download_episode(episode) {
    this.loading = true;
    this.scrapingService.retrieveEpisode(this.show['title'], episode['label'])
      .subscribe(result => {
        if (this.selectedTorrent) { result = this.selectedTorrent; }
        if (result) {
          console.log('Found', result);
          this.torrentService.addTorrent({
            magnet: result['magnet'],
            infoHash: magnet.decode(result['magnet']).infoHash,
            show: this.show['title'],
            episode: episode['label'],
            dn: result['name'],
            date: episode['date']
          }).subscribe(() => {
            console.log('Torrent ready for download');
            this.subsService.downloadSub(result['name'], this.path.join(this.show['title'], episode['label'])).subscribe();
          });
          this.dbService.addTorrent({
            dn: result['name'],
            infoHash: magnet.decode(result['magnet']).infoHash,
            magnet: result['magnet'],
            dashed_title: this.show['dashed_title'],
            title: this.show['title'],
            episode_label: episode['label'],
            status: 'pending',
            date: episode['date']
          }).subscribe(show => {
            console.log('Updated show', show);
            this.show = show;
          });

        } else {
          console.log('No results');
        }
        this.loading = false;
      });
  }

  play(episode) {
    this.dbService.getShow(this.show['dashed_title'])
      .subscribe(show => {
        this.show = show;
        const s = episode['label'].substring(1, 3),
          e = episode['label'].substring(4, 6),
          fresh_ep = this.show['Seasons'][Number(s)][Number(e) - 1],
          path = this.path.join(this.app.getPath('downloads'), 'Cereal', this.show['title'], fresh_ep['label']
          // this.fs.readdirSync(this.path.join(this.app.getPath('downloads'), 'Cereal', this.show['title'], fresh_ep['label']))[0]
        );

        let video_path = path;
        const that = this;
        const files = this.fs.readdirSync(path);
        files.map(file => {
          const stats = that.fs.statSync(that.path.join(path, file));
            if (stats.isDirectory()) {
              video_path = that.path.join(path, file);
              console.log('video path', video_path);
            }
        });

          localStorage.setItem('play', JSON.stringify({
            show: this.show,
            episode: episode,
            file_path: video_path
          }));
          this.router.navigate(['play']);
      });
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
    if (this.currentTorrentsListSub) { this.currentTorrentsListSub.unsubscribe(); }
    this.currentTorrentsListSub = this.scrapingService.retrieveTorrentsList(this.show['dashed_title'], episode.label)
    .subscribe(result => {
      if (result) {
        this.hasResults = true;
        this.loading = false;
        this.ep_torrents.push(result);
        // currentTorrentsListSub.unsubscribe();
      }
    }, notFound => {
        this.loading = false;
        this.hasResults = false;
      });
      return this.currentTorrentsListSub;
  }

  onTorrentChange(t) {
    console.log('Torrent changed:', t);
    this.selectedTorrent = t;
    this.dbService.getTorrent(magnet.decode(t.magnet).infoHash)
      .subscribe(_t => {
        console.log(_t);
      });
  }

  deleteTorrent(episode) {
    episode['dashed_title'] = this.show['dashed_title'];
    episode['episode_label'] = episode['label'];
    console.log('deleteTorrent', episode);

    this.emit.emit(episode);

    // delete from torrent client
    this.torrentService.removeTorrent(episode.infoHash);

    // delete from db shows
    this.dbService.deleteTorrent(episode.infoHash).subscribe();

    // delete from db torrent
    this.dbService.deleteEpisode(episode).subscribe(() => {
      this.setup(true);
    });
  }


}
