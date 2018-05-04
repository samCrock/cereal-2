import { Injectable } from '@angular/core';
// import { Observable } from 'rxjs/Observable';
import { Observable } from 'rxjs/Rx';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/observable/of';
import { mergeMap, catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as cheerio from 'cheerio';
import * as moment from 'moment';


@Injectable()
export class ScrapingService {

	constructor(private http: HttpClient) {}

	retrieveShow(show: string): Observable<any> {
		const _show = show;
		return Observable.create(observer => {
			return this.http.get<any[]>('https://trakt.tv/shows/' + _show, { responseType: 'text' as 'json'})
			.subscribe(response => {
				const $ = cheerio.load(response),
				dashed_title = _show,
				// poster = $('.sidebar')['0'].children[0].children[1].attribs['data-original'],
				title = $('#summary-ratings-wrapper')['0'].next.children[0].children[0].children[1].children[0].children[0].data.trim(),
				seasons = $('.season-count')[1].attribs['data-all-count'],
				genres = $('#overview')['0'].children[2].children[0].children[0].children[6] ? $('#overview')['0'].children[2].children[0].children[0].children[6].children : [],
				premiered = $('#overview')['0'].children[2].children[0].children[0].children[1].children[2] ? $('#overview')['0'].children[2].children[0].children[0].children[1].children[2].attribs.content : '',
				overview = $('#overview')[1].children[0].children[0].data,
				trailer = $('.affiliate-links')['0'].children[0] ? $('.affiliate-links')['0'].children[0].children[1].attribs.href : '',
				// wallpaper = $('#summary-wrapper')['0'].attribs['data-fanart'];
				poster = this.retrievePoster(_show);
				let network = $('.additional-stats')['0'].children[0].children[4] ? $('.additional-stats')['0'].children[0].children[4].data : '',
				runtime = $('#overview')['0'].children[2].children[0].children[0].children[2].children[1].data,
				genresArray = [];

				network = network.split(' on ');
				network = network[1];
				runtime = runtime ? runtime.split(' mins').join('') : '';
				genres.filter((genre, i) => {
					if (i % 2 && i !== 0 && genre.children) genresArray.push(genre.children[0].data)
				})
				poster.subscribe(res_poster => {
					const show = {
						updated: new Date,
						title: title,
						dashed_title: dashed_title,
						network: network,
						premiered: premiered,
						runtime: runtime,
						genres: genresArray,
						overview: overview,
						trailer: trailer,
						// wallpaper: wallpaper,
						poster: res_poster,
						seasons: seasons,
						Seasons: {}
					}
					return observer.next(show);
				})
					
			})

		})
	}

	retrieveShowSeason(show, season): Observable<any> {
		return Observable.create(observer => {
			return this.http.get<any[]>('https://trakt.tv/shows/' + show + '/seasons/' + season, { responseType: 'text' as 'json'})
			.subscribe(response => {
				const $ = cheerio.load(response);
				let episodes = [];
				$('.titles').filter((i, episode) => {
					let ep_label = '',
					ep_title = '',
					ep_date = '';

					if (episode.children[0].name === 'h3') {
						// console.log(episode);
						ep_label = episode.children[0].children[1] ? episode.children[0].children[1].children[0].children[0].data : episode.children[0].children[0].children[0].children[0].data;
						ep_title = (episode.children[0].children[1] && episode.children[0].children[1].children[2].children[0]) ? episode.children[0].children[1].children[2].children[0].data : '';
						ep_date = episode.children[1].children[0].children[0].attribs['data-date'];
						if (i === 1) { ep_date = episode.children[1].children[0].children[2].attribs['data-date'] }
						// Format episode label
					if (ep_label.indexOf('x') === 1) {
						ep_label = 'S0' + ep_label;
					} else {
						ep_label = 'S' + ep_label;
					}
					ep_label = ep_label.slice(0, ep_label.indexOf('x')) + 'E' + ep_label.slice(ep_label.indexOf('x') + 1, ep_label.length);

					if (ep_date) ep_date = ep_date.substring(0, 10);
					if (!ep_date) ep_date = '';

					episodes.push({
						label: ep_label,
						title: ep_title,
						date: ep_date
					});
				}
			})
				return observer.next(episodes);
			})
		})
	}

	retrieveCalendar(): Observable<any> {
		return Observable.create(observer => {
			return this.retrieveRemoteCalendar(observer);
		});
	}

	retrieveRemoteCalendar(observer: any) {
		const lastWeek = moment().subtract(6, 'days').format('YYYY-MM-DD');
		return this.http.get<any[]>('https://trakt.tv/calendars/shows/' + lastWeek, { responseType: 'text' as 'json' })
		.subscribe(response => {
			const $ = cheerio.load(response);
			let week = [];
			console.log('Week', lastWeek);
			$('.fanarts, .calendar-list').filter((i, result) => {
				const dotm = result.children[0].children[0].children[0].data,
				month = result.children[0].children[1].children[0].data;
				let year = Number(moment().format('YYYY'));
				if (moment().month() == 11 && month == 'January') {
					year = +year
				}
				var date = moment(year + ' ' + month + ' ' + dotm, 'YYYY MMM DD').format('DD-MM-YYYY');
				var day = {
					date: date,
					shows: []
				}
				for (i = 1; i < result.children.length; i++) {
					if (result.children[i].attribs['data-episode-id']) {
						var episode, network, title,
						poster = result.children[i].children[1].children[0].children[1].attribs['data-original'];
						if (result.children[i].children[1].children[0].children.length == 7) {
							if (result.children[i].children[1].children[0].children[6].children.length == 8) {
								title = result.children[i].children[1].children[0].children[6].children[7].children[0].attribs['content'];
								episode = result.children[i].children[1].children[0].children[6].children[3].children[0].children[0].data;
								network = result.children[i].children[1].children[0].children[6].children[2].children[0].data;
								console.log(title, 'Season premiere');
							} else {
								title = result.children[i].children[1].children[0].children[6].children[6].children[0].attribs['content'];
								episode = result.children[i].children[1].children[0].children[6].children[2].children[0].children[0].data;
								network = result.children[i].children[1].children[0].children[6].children[1].children[0].data;
							}
						} else {
							if (result.children[i].children[1].children[0].children[5].children.length == 9) {
								title = result.children[i].children[1].children[0].children[5].children[8].children[0].attribs['content'];
								network = result.children[i].children[1].children[0].children[5].children[2].children[0].data;
								episode = result.children[i].children[1].children[0].children[5].children[4].children[0].children[0].data;
								console.log(title, 'Season Finale');
							} else {
								title = result.children[i].children[1].children[0].children[5].children[7].children[0].attribs['content'];
								network = result.children[i].children[1].children[0].children[5].children[1].children[0].data;
								episode = result.children[i].children[1].children[0].children[5].children[3].children[0].children[0].data;
							}
						}

						episode = episode.split('x');
						if (episode[0].length == 1) {
							episode[0] = '0' + episode[0]
						}
						episode[0] = 's' + episode[0];
						episode[1] = 'e' + episode[1];
						episode = episode[0] + episode[1];
						var dashed_title = result.children[i].children[0].attribs['content'].split('/')[4];
						let showObject = {
							title: title,
							dashed_title: dashed_title,
							episode: episode,
							network: network,
							runtime: result.children[i].attribs['data-runtime'],
							poster: this.retrievePoster(dashed_title)
							// poster: poster
						}
						if (title) {
							const match = title.match(/(200[0-9]|201[0-9])/);
							if (title.match(/(200[0-9]|201[0-9])/)) {
								title = title.substring(0, match['index']);
								title = title.replace(/-/g, ' ').trim();
								console.log('Cleared title string:', title);
								showObject['cleared_title'] = title;
							}
						}
						day.shows.push(showObject);
					}
				}
				if (day.shows.length > 0) week.push(day);
			});

			// Finally
			return observer.next(week);
		});

	}


	retrievePoster(dashed_title: string): Observable<any> {
		return Observable.create(observer => {
			return this.retrieveRemotePoster(dashed_title, observer);
		});
	}

	retrieveRemotePoster(dashed_title: string, observer) {
		// console.log('Retrieving poster for', dashed_title);
		return this.http.get('http://www.imdb.com/find?ref_=nv_sr_fn&q=' + dashed_title + '&s=all', { responseType: 'text' as 'json' })
		.subscribe(response => {
			const $ = cheerio.load(response),
			results = $('.primary_photo');
			const small_img = results[0].children[1].children[0].attribs.src;

			// console.log(dashed_title, small_img);

			let large_img = small_img.replace('V1_UX32_CR0,0,32,44_AL_', 'V1_UY268_CR1,0,182,268_AL_');

			if (small_img.indexOf('V1_UX32_CR0,0,32,44_AL_') < 0) {
				large_img = small_img.replace('V1_UY44_CR0,0,32,44_AL_', 'V1_UY182_CR0,0,182,268_AL_');
				if (small_img.indexOf('V1_UY44_CR1,0,32,44_AL_') > -1) {
					large_img = small_img.replace('V1_UY44_CR1,0,32,44_AL_', 'V1_UY268_CR12,0,182,268_AL_');
				}
				if (small_img.indexOf('V1_UY44_CR13,0,32,44_AL_') > -1) {
					large_img = small_img.replace('V1_UY44_CR13,0,32,44_AL_', 'V1_UY268_CR87,0,182,268_AL_');
				}
			}

			return observer.next(large_img);
		});
	}

	// retrieveRemotePoster(dashed_title: string, observer) {
	// 	console.log('Retrieving poster for', dashed_title);
	// 	return this.http.get('https://trakt.tv/shows/' + dashed_title, { responseType: 'text' as 'json' })
	// 	.subscribe(response => {
	// 		const $ = cheerio.load(response),
	// 		results = $('.poster');
	// 		const poster = results[0].children[1].attribs['data-original'];

	// 		console.log(dashed_title, poster);

	// 		return observer.next(poster);
	// 	});
	// }


	retrieveEpisode(show: string, episode: string) {
		show = show.replace(/'/g, ' ');
		const url = encodeURI('https://idope.se/torrent-list/' + show + ' ' +  episode);
		console.log('Downloading episode', show, episode);
		// console.log('url', url);
		return Observable.create(observer => {
			return this.http.get<any[]>(url, { responseType: 'text' as 'json' })
			.subscribe(response => {
				const $ = cheerio.load(response);
				if ($('.resultdiv')[1]) {
					let magnet = 'magnet:?xt=urn:btih:' +
					$('.resultdiv')[1].children[3].children[11].children[0].data + '&dn=' +
					$('.resultdiv')[1].children[3].children[13].children[0].data +
					$('#hidetrack')[0].attribs.value

					// console.log($('.resultdiv')[1]);

					return observer.next({
						name   : $('.resultdiv')[1].children[1].children[5].children[0].children[0].data.trim(),
						seeds  : $('.resultdiv')[1].children[3].children[7].children[3].children[0].data,
						magnet : magnet
					});
				} else {
					return observer.next();
				}
			});
		});
	}
	


}