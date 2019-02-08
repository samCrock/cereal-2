import { Component, Input, Output, OnInit, OnDestroy, EventEmitter } from '@angular/core';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/observable/interval';
import 'rxjs/add/operator/mergeMap';
import { DbService, SubsService, ScrapingService, TorrentService, WtService } from '../../services';
import * as moment from 'moment';
import { ElectronService } from 'ngx-electron';
import { Router } from '@angular/router';
import * as magnet from 'magnet-uri';
import { ChangeDetectorRef } from '@angular/core';
import { interval } from 'rxjs/internal/observable/interval';
import { Subscription } from 'rxjs/Subscription';


@Component({
  selector: 'app-episode',
  templateUrl: './episode.component.html',
  styleUrls: ['./episode.component.scss'],
  providers: [DbService, ScrapingService, SubsService, TorrentService, WtService]

})
export class EpisodeComponent implements OnInit, OnDestroy {

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

  private wt_client;

  public progress;
  public progressSubscription: Subscription;
  public speed;
  public speedSubscription: Subscription;

  constructor(
    public dbService: DbService,
    public scrapingService: ScrapingService,
    public subsService: SubsService,
    public torrentService: TorrentService,
    public electronService: ElectronService,
    public wtService: WtService,
    public router: Router,
    private cdRef: ChangeDetectorRef
  ) {
  }

  ngOnInit() {
    this.setup();
  }

  ngOnDestroy() {
    this.progressSubscription.unsubscribe();
  }

  setup() {

    this.fetchProgress();

    if (!this.show) {
      this.dbService.getShow(this.episode['dashed_title'])
        .subscribe(show => {
          this.show = show;
        });
    }
    if (this.episode['episode_label']) {
      this.episode['label'] = this.episode['episode_label'];
    }
    if (this.router.url === '/torrents') {
      this.titleAsButton = true;
    }

    this.cdRef.detectChanges();

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

  fetchProgress() {
    this.progressSubscription = interval(500).subscribe(() => {
      const that = this;
      if (this.episode['dn'] && this.episode['status'] === 'pending') {
        const t = this.torrentService.getTorrentByHash(this.episode['infoHash']);

        // console.log('Fetch current?', this.episode['infoHash'], t['progress'], t['downloadSpeed']);

        if (t) {
          if (t['progress'] !== 1) {
            that.speed = (Math.round(t['downloadSpeed'] / 1048576 * 100) / 100).toString();
            that.progress = Math.round(t['progress'] * 100);
          } else {
            that.progress = 100;
            delete that.speed;
            this.progressSubscription.unsubscribe();
          }
        }

      }
      if (this.episode['status'] === 'ready') {
        this.progress = 100;
        delete this.speed;
        this.progressSubscription.unsubscribe();
      }
      that.cdRef.detectChanges();
    });
  }

  isPlayable() {
    // return this.episode['status'] && this.progress > 0;
    return this.episode['status'];
  }

  download_episode(episode) {
    this.loading = true;
    console.log('download_episode', episode);
    // Retrieve episode from db
    let result;
    this.dbService.getEpisode(this.show['dashed_title'], episode['label'])
      .subscribe(dbEpisode => {
        console.log('dbEpisode', dbEpisode);
        result = dbEpisode;
        this.scrapingService.retrieveEpisode(this.show['title'], episode.label)
          .subscribe(scrapedEpisode => {
            console.log('scrapedEpisode', scrapedEpisode);
            if (!scrapedEpisode) {
              return this.loading = false;
            }
            if (!result.magnetURI) {
              result.magnetURI = scrapedEpisode.magnetURI;
            }
            // Set dn
            result.dn = scrapedEpisode.dn;
            // Set infohash
            result.infoHash = magnet.decode(result['magnetURI']).infoHash;

            // Finalize
            this.torrentService.addTorrent({
              magnetURI: result.magnetURI,
              title: this.show['title'],
              episode_label: result.label
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
              this.show = show;
              this.dbService.getEpisode(this.show['dashed_title'], this.episode['label'])
                .subscribe(ep => {
                  this.episode = ep;
                  this.setup();
                  if (this.expanded) {
                    this.toggleExtra(episode);
                  }
                  this.loading = false;
                });
            });

          });
      });
  }


  play(episode, dn) {
    this.loading = false;
    this.dbService.getShow(this.show['dashed_title'])
      .subscribe(show => {
        this.show = show;
        localStorage.setItem('play', JSON.stringify({
          show: this.show,
          episode: episode,
          dn: dn
        }));
        if (this.format === 'extended') {
          this.router.navigate(['play', { show: this.show['dashed_title'], episode: this.episode['label'] }]);
        } else {
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
      this.loading = true;
      this.scrapingService.retrieveTorrentsList(this.show['title'], episode.label)
        .subscribe(result => {
          this.hasResults = true;
          this.loading = false;
          this.ep_torrents.push(result);
        });
    } else {
      this.ep_torrents = [];
      this.loading = false;
      this.hasResults = false;
    }
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
    this.loading = true;

    this.ep_torrents = [];

    episode['dashed_title'] = this.show['dashed_title'];
    episode['episode_label'] = episode['label'];

    // this.notify.emit(episode);

    this.dbService.getEpisode(this.show['dashed_title'], episode['episode_label'])
      .subscribe(dbEpisode => {
        console.log('Deleting', dbEpisode);

        this.torrentService.removeTorrent(dbEpisode).subscribe(result => {
          console.log('Torrent Episode deletion:', result);

          // delete files
          const folder_path = this.path.join(this.app.getPath('downloads'), 'Cereal', this.show['title'], episode['episode_label']);
          console.log('Deleting all files from directory:', folder_path);
          this.fsExtra.remove(folder_path, err => {
            if (err) { console.error(err); }
          });

          this.expanded = false;
          this.loading = false;
        });


        // delete from db show
        this.dbService.deleteEpisode(episode).subscribe(() => {
          console.log('DB Episode deleted');
          this.dbService.getEpisode(this.show['dashed_title'], this.episode['label'])
            .subscribe(ep => {
              delete this.progress;
              delete this.speed;
              this.episode = ep;
              this.setup();
            });
        });

      });

    // // delete from torrent client
    // this.dbService.getTorrents().subscribe(torrents => {
    //   torrents.forEach(t => {
    //     if (t['dashed_title'] === episode['dashed_title'] && t['episode_label'] && episode['episode_label']) {
    //       this.dbService.deleteTorrent(t.infoHash).subscribe();
    //       this.torrentService.removeTorrent(t.infoHash).subscribe();
    //     }
    //   });
    // });



  }


}
