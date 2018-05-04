import { Component, Input, OnChanges } from '@angular/core';
import { Observable } from 'rxjs/Rx';
import { DbService, SubsService, ScrapingService, TorrentService } from '../../services';
import * as moment from 'moment';
import { ElectronService } from 'ngx-electron';
import * as magnet from 'magnet-uri';

@Component({
  selector: 'episode',
  templateUrl: './episode.component.html',
  styleUrls: ['./episode.component.scss'],
  providers: [ DbService, ScrapingService, SubsService, TorrentService]

})
export class EpisodeComponent implements OnChanges {

  @Input() show: Object;
  @Input() episode: Object;

  private path = this.electronService.remote.getGlobal('path');
  private shell = this.electronService.remote.getGlobal('shell');
  
  constructor(
    private dbService: DbService,
    private scrapingService: ScrapingService,
    private subsService: SubsService,
    private torrentService: TorrentService,
    private electronService: ElectronService,
    ) {}

  ngOnChanges() {
    if (!this.show) {
      this.dbService.getShow(this.episode['dashed_title'])
      .subscribe(show => {
        this.show = show;
        console.log('this.show', this.show);
      })
    }
    console.log('this.episode', this.episode);
    console.log('this.show', this.show);
    if (this.episode['episode_label']) { this.episode['label'] = this.episode['episode_label']; }
  }

  formatDate(date) {
    if (date) return moment(date, 'YYYY-MM-DD').fromNow();
    if (!date) return 'No air date';
  }

  downloadable(air_date) {
    return moment(air_date, 'YYYY-MM-DD').diff(moment(), 'hours') < 24
  }

  getTorrentProgress(episode): Observable<any> {
    let s = episode['label'].substring(1, 3),
    e = episode['label'].substring(4, 6);
    if (this.show['Seasons'][Number(s)]) {
      if (this.show['Seasons'][Number(s)][Number(e) - 1].status === 'ready') { 
        return Observable.of(100);
      }
      return this.dbService.getTorrentProgress(this.show['Seasons'][Number(s)][Number(e) - 1].infoHash);
    }
  }

  getTorrentDownloadSpeed(episode): Observable<any> {
    let s = episode['label'].substring(1, 3),
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
    this.scrapingService.retrieveEpisode(this.show['title'], episode['label'])
    .subscribe(result => {
      if (result) {
        console.log('Found', result['name']);
        this.torrentService.addTorrent({
          magnet: result['magnet'],
          infoHash: magnet.decode(result['magnet']).infoHash,
          show: this.show['title'],
          episode: episode['label'],
          dn: result['name']
        });
        this.dbService.addTorrent({
          dn: result['name'],
          infoHash: magnet.decode(result['magnet']).infoHash,
          magnet: result['magnet'],
          dashed_title: this.show['dashed_title'],
          title: this.show['title'],
          episode_label: episode['label'],
          status: 'pending'
        }).subscribe(show => {
          console.log('Updated show', show);
          this.show = show;
        });
        
        this.subsService.downloadSub(result['name'], this.path.join(this.show['title'], episode['label'], result['name']) ).subscribe();

      } else {
        console.log('No results');
      }
    });
  }


  play(episode) {
    this.dbService.getShow(this.show['dashed_title'])
    .subscribe(show => {
      this.show = show;
      let s = episode['label'].substring(1, 3),
      e = episode['label'].substring(4, 6);
      let fresh_ep = this.show['Seasons'][Number(s)][Number(e) - 1]
      let path = 'c:\\Users\\sam\\Downloads\\cereal\\' + this.show['title'] + '\\' + fresh_ep['label'] + '\\' + fresh_ep['dn'];
      this.shell.openItem(path);
    })
  }


  
}
