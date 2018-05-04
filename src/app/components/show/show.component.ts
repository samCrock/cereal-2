import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ScrapingService, TorrentService, DbService, SubsService } from '../../services';
import * as moment from 'moment';
import { Observable } from 'rxjs/Rx';
import { ActivatedRoute } from '@angular/router';
import { IntervalObservable } from "rxjs/observable/IntervalObservable";
import { Subscription } from 'rxjs/Subscription';
import * as magnet from 'magnet-uri';
import { ElectronService } from 'ngx-electron';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
	selector: 'app-show',
	templateUrl: './show.component.html',
	styleUrls: ['./show.component.scss'],
	providers: [ScrapingService, TorrentService, DbService]
})
export class ShowComponent implements OnInit, OnDestroy {

	private title: string;
	private show: {};
	private episodes = [];
	private current_season: number;
	private alive: boolean;
	private shell = this.electronService.remote.getGlobal('shell');
	private path = this.electronService.remote.getGlobal('path');
	private wt_client = this.electronService.remote.getGlobal('wt_client');
	private minified = false;
	private sanitizedTrailer;
	private openedTrailer = false;

	constructor(
		private scrapingService: ScrapingService,
		private torrentService: TorrentService,
		private dbService: DbService,
		private subsService: SubsService,
		private route: ActivatedRoute,
		private electronService: ElectronService,
		private sanitizer: DomSanitizer
		)
	{
		this.alive = true;
	}

	ngOnInit() {
		window.scrollTo(0, 0);
		this.route.params.subscribe(params => {
			this.title = params['title'];

			this.dbService.getShow(this.title)
			.subscribe(show => {
				this.show = show;
				console.log('show from db', show);
				this.current_season = this.show['seasons'];
				this.retrieveSeason();
			}, () => {
				this.scrapingService.retrieveShow(this.title)
				.subscribe(show => {
					this.show = show;
					console.log('show from remote', show);
					this.dbService.addShow(this.show);
					this.current_season = this.show['seasons'];
					this.retrieveSeason();
				})
				
			});

		});


	}


	ngOnDestroy(){}


	formatDate(date) {
		if (date) return moment(date, 'YYYY-MM-DD').fromNow();
		if (!date) return 'No air date';
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
					dashed_title: this.title,
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

	retrieveSeason() {
		if (this.show['Seasons'][this.current_season]) { 
			return this.episodes = this.show['Seasons'][this.current_season]; 
		}
		this.scrapingService.retrieveShowSeason(this.show['dashed_title'], this.current_season)
		.subscribe(episodes => {
			console.log('Season', this.current_season, episodes);
			this.episodes = episodes;
			this.dbService.addSeason(this.show['dashed_title'], this.current_season, episodes)
			.subscribe(show => {
				console.log('Season', this.current_season, 'saved');
				this.show = show;
			});
		})
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


	// Open File
	play(episode) {
		this.dbService.getShow(this.title)
		.subscribe(show => {
			this.show = show;
			let s = episode['label'].substring(1, 3),
			e = episode['label'].substring(4, 6);
			let fresh_ep = this.show['Seasons'][Number(s)][Number(e) - 1]
			let path = 'c:\\Users\\sam\\Downloads\\cereal\\' + this.show['title'] + '\\' + fresh_ep['label'] + '\\' + fresh_ep['dn'];
			this.shell.openItem(path);
		})
	}

	downloadable(air_date) {
		return moment(air_date, 'YYYY-MM-DD').diff(moment(), 'hours') < 24
	}

	play_trailer() {
		this.openedTrailer = true;
	}

	getTrailer() {
		if (!this.sanitizedTrailer) { this.sanitizedTrailer = this.sanitizer.bypassSecurityTrustResourceUrl(this.show['trailer'].replace('watch?v=', 'embed/')); }
		return this.sanitizedTrailer;
	}

	closeTrailer() {
		this.openedTrailer = false;
	}

	// NAVIGATION
	navigate_next() {
		this.current_season++;
		this.retrieveSeason();
	}
	navigate_previous() {
		this.current_season--;
		this.retrieveSeason();
	}
	navigate_last() {
		this.current_season = this.show['seasons'];
		this.retrieveSeason();
	}
	navigate_first() {
		this.current_season = 1;
		this.retrieveSeason();
	}
	/////////////



}
