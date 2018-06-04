import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/observable/of';
import { mergeMap, catchError } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as cheerio from 'cheerio';
import * as moment from 'moment';
import { DbService } from './db.service';
import { ElectronService } from 'ngx-electron';

@Injectable()
export class ScrapingService {

  private exec = this.electronService.remote.getGlobal('exec');
  private path = this.electronService.remote.getGlobal('path');
  private app = this.electronService.remote.getGlobal('app');
  private fs = this.electronService.remote.getGlobal('fs');

  constructor(
    private http: HttpClient,
    private dbService: DbService,
    public electronService: ElectronService
  ) {}

  retrieveShow(show: string): Observable < any > {
    const _show = show;
    return Observable.create(observer => {
      return this.http.get < any[] > ('https://trakt.tv/shows/' + _show, { responseType: 'text' as 'json' })
        .subscribe(response => {
          const $ = cheerio.load(response),
            dashed_title = _show;
          // poster = $('.sidebar')['0'].children[0].children[1].attribs['data-original'],
          let title = $('#summary-ratings-wrapper')['0'].next.children[0].children[0].children[1].children[0].children[0].data;
          if (title) { title = title.trim(); } else { title = ''; }
          const seasons = $('.season-count')[1] ? $('.season-count')[1].attribs['data-all-count'] : 0,
            genres = $('#overview')['0'].children[2].children[0].children[0].children[6] ?
            $('#overview')['0'].children[2].children[0].children[0].children[6].children : [],
            premiered = $('#overview')['0'] && $('#overview')['0'].children[2].children[0].children[1].children[2] &&
            $('#overview')['0'].children[2].children[0].children[0].children[1].children[2].attribs ?
            $('#overview')['0'].children[2].children[0].children[0].children[1].children[2].attribs.content : '',
            overview = $('#overview')[1].children[0] ? $('#overview')[1].children[0].children[0].data : '',
            trailer = $('.affiliate-links')['0'].children[0] ? $('.affiliate-links')['0'].children[0].children[1].attribs.href : '',
            wallpaper = $('#summary-wrapper')['0'].attribs['data-fanart'],
            poster = this.retrievePoster(_show);
          let network = $('.additional-stats')['0'].children[0].children[4] ? $('.additional-stats')['0'].children[0].children[4].data : '',
            runtime = $('#overview')['0'].children[2].children[0].children[0].children[2] ?
            $('#overview')['0'].children[2].children[0].children[0].children[2].children[1].data : '';
          const genresArray = [];

          network = network.split(' on ');
          network = network[1];
          runtime = runtime ? runtime.split(' mins').join('') : '';
          genres.filter((genre, i) => {
            if (i % 2 && i !== 0 && genre.children) { genresArray.push(genre.children[0].data); }
          });
          poster.subscribe(res_poster => {
            return observer.next({
              title: title,
              dashed_title: dashed_title,
              network: network,
              premiered: premiered,
              runtime: runtime,
              genres: genresArray,
              overview: overview,
              trailer: trailer,
              poster: res_poster,
              wallpaper: wallpaper,
              seasons: seasons,
              Seasons: {}
            });
          });
        });
    });
  }

  retrieveShowSeason(show, season): Observable <any> {
    return Observable.create(observer => {
      return this.http.get < any[] > ('https://trakt.tv/shows/' + show + '/seasons/' + season, { responseType: 'text' as 'json' })
        .subscribe(response => {
          const $ = cheerio.load(response);
          const episodes = [];
          $('.titles').filter((i, episode) => {
            let ep_label = '',
              ep_title = '',
              ep_date = '';
            if (episode.children[0].name === 'h3') {
              // console.log(episode);
              ep_label = episode.children[0].children[1] ? episode.children[0].children[1].children[0].children[0].data :
                episode.children[0].children[0].children[0].children[0].data;
              ep_title = (episode.children[0].children[1] && episode.children[0].children[1].children[2].children[0]) ?
                episode.children[0].children[1].children[2].children[0].data : '';
              ep_date = episode.children[1].children[0].children[0].attribs['data-date'];
              if (i === 1) {
                ep_date = episode.children[1].children[0].children[2].attribs['data-date'];
              }
              // Format episode label
              if (ep_label.indexOf('x') === 1) {
                ep_label = 'S0' + ep_label;
              } else {
                ep_label = 'S' + ep_label;
              }
              ep_label = ep_label.slice(0, ep_label.indexOf('x')) + 'E' + ep_label.slice(ep_label.indexOf('x') + 1, ep_label.length);

              if (ep_date) { ep_date = ep_date.substring(0, 10); }
              if (!ep_date) { ep_date = ''; }

              episodes.push({
                label: ep_label,
                title: ep_title,
                date: ep_date
              });
            }
          });
          return observer.next(episodes);
        });
    });
  }

  retrieveCalendar(): Observable < any > {
    return Observable.create(observer => {
      return this.retrieveRemoteCalendar(observer);
    });
  }

  retrieveRemoteCalendar(observer: any) {
    const lastWeek = moment().subtract(6, 'days').format('YYYY-MM-DD');
    return this.http.get < any[] > ('https://trakt.tv/calendars/shows/' + lastWeek, { responseType: 'text' as 'json' })
      .subscribe(response => {
        const $ = cheerio.load(response);
        const week = [];
        console.log('Week', lastWeek);
        $('.fanarts, .calendar-list').filter((i, result) => {
          const dotm = result.children[0].children[0].children[0].data,
            month = result.children[0].children[1].children[0].data;
          let year = Number(moment().format('YYYY'));
          if (moment().month() === 11 && month === 'January') {
            year = +year;
          }
          const date = moment(year + ' ' + month + ' ' + dotm, 'YYYY MMM DD').format('DD-MM-YYYY');
          const day = {
            date: date,
            shows: []
          };
          for (i = 1; i < result.children.length; i++) {
            if (result.children[i].attribs['data-episode-id']) {
              let episode, network, title;
              const poster = result.children[i].children[1].children[0].children[1].attribs['data-original'];
              if (result.children[i].children[1].children[0].children.length === 7) {
                if (result.children[i].children[1].children[0].children[6].children.length === 8) {
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
                if (result.children[i].children[1].children[0].children[5].children.length === 9) {
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
              if (episode[0].length === 1) {
                episode[0] = '0' + episode[0];
              }
              episode[0] = 's' + episode[0];
              episode[1] = 'e' + episode[1];
              episode = episode[0] + episode[1];
              const dashed_title = result.children[i].children[0].attribs['content'].split('/')[4];
              const showObject = {
                title: title,
                dashed_title: dashed_title,
                episode: episode,
                network: network,
                runtime: result.children[i].attribs['data-runtime'],
                poster: this.retrievePoster(dashed_title)
                // poster: poster
              };
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
          if (day.shows.length > 0) { week.push(day); }
        });

        // Finally
        return observer.next(week);
      });

  }

  retrievePoster(dashed_title: string): Observable <any> {
    return Observable.create(observer => {
      const poster_path = this.path.join(this.app.getPath('appData'), 'Cereal', 'posters', dashed_title + '.jpg');
      if (this.fs.pathExistsSync(poster_path)) {
        return observer.next(this.normalizePath(poster_path));
      } else {
        this.dbService.getShow(dashed_title)
        .subscribe(show => {
          const _observer = observer;
          if (show.poster) {
            return _observer.next(show.poster);
          } else {
            return this.retrieveRemotePoster(dashed_title, _observer);
          }
        }, noShow => {
          return this.retrieveRemotePoster(dashed_title, observer);
        });
      }
    });
  }

    retrieveAlternatePoster(dashed_title: string, observer) {
      // console.log('Retrieving poster for', dashed_title);
      return this.http.get('http://www.imdb.com/find?ref_=nv_sr_fn&q=' + dashed_title + '&s=all', { responseType: 'text' as 'json' })
        .subscribe(response => {
          const $ = cheerio.load(response),
            results = $('.primary_photo');
          if (results[0]) {
            const small_img = results[0].children[1].children[0].attribs.src;
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
          } else {
            return observer.next('');
          }
        });
    }

  normalizePath(path) {
    path = this.path.normalize(path);
    path = path.replace(/\\/g, '/');
    return path;
  }

  retrieveRemotePoster(dashed_title: string, observer) {
    console.log('Retrieving poster for', dashed_title);
    return this.http.get('https://trakt.tv/shows/' + dashed_title, { responseType: 'text' })
      .subscribe(response => {
        const $ = cheerio.load(response),
          results = $('.poster');
        const poster = results[0].children[1].attribs['data-original'];

        console.log(dashed_title, poster);
        let path = this.path.join(this.app.getPath('appData'), 'Cereal', 'posters');
        this.fs.mkdirsSync(path);
        path = this.path.join(path, dashed_title + '.jpg');
        this.exec('curl ' + poster + ' > ' + path, (err, stdout, stderr) => {
          if (err) {
            console.error(err);
            // return observer.next(this.retrieveAlternatePoster(dashed_title, observer));
          }
          path = this.normalizePath(path);
          return observer.next(path);
        });

      });
  }

  retrieveRemoteWallpaper(dashed_title: string): Observable<any> {
    return Observable.create(observer => {
    console.log('Retrieving poster for', dashed_title);
      this.http.get('https://trakt.tv/shows/' + dashed_title, { responseType: 'text' })
        .subscribe(response => {
          const $ = cheerio.load(response),
          results = $('#summary-wrapper')['0'].attribs['data-fanart'];
          const wallpaper = results;

          console.log(dashed_title, wallpaper);
          let path = this.path.join(this.app.getPath('appData'), 'Cereal', 'wallpapers');
          this.fs.mkdirsSync(path);
          path = this.path.join(path, dashed_title + '.jpg');
          this.exec('curl ' + wallpaper + ' > ' + path, (err, stdout, stderr) => {
            if (err) {
              console.error(err);
              // return observer.next(this.retrieveAlternatePoster(dashed_title, observer));
            }
            path = this.normalizePath(path);
            return observer.next(path);
          });
        });
      });
  }


  // retrieveEpisode(show: string, episode: string, custom?: number) {
  //   show = show.replace(/'/g, ' ');
  //   const url = encodeURI('https://idope.se/torrent-list/' + show + ' ' + episode);
  //   console.log('Downloading episode', show, episode);
  //   // console.log('url', url);
  //   return Observable.create(observer => {
  //     return this.http.get<any[]>(url, { responseType: 'text' as 'json' })
  //       .subscribe(response => {
  //         const $ = cheerio.load(response);
  //         const _custom = custom ? custom : 1;
  //         if ($('.resultdiv')[_custom]) {
  //           const magnet = 'magnet:?xt=urn:btih:' +
  //             $('.resultdiv')[_custom].children[3].children[11].children[0].data + '&dn=' +
  //             $('.resultdiv')[_custom].children[3].children[13].children[0].data +
  //             $('#hidetrack')[0].attribs.value;

  //           return observer.next({
  //             name: $('.resultdiv')[_custom].children[1].children[5].children[0].children[0].data.trim(),
  //             seeds: $('.resultdiv')[_custom].children[3].children[7].children[3].children[0].data,
  //             magnet: magnet
  //           });
  //         } else {
  //           return observer.next();
  //         }
  //       });
  //   });
  // }
  retrieveEpisode(show: string, episode: string, custom?: number) {
    show = show.replace(/'/g, ' ');
    const url = encodeURI('https://indiaproxy.in/s/?q=' + show + ' ' + episode);
    console.log('Downloading episode', show, episode);
    // console.log('url', url);
    return Observable.create(observer => {
      return this.http.get<any[]>(url, { responseType: 'text' as 'json' })
        .subscribe(response => {
          const $ = cheerio.load(response);
          const _custom = custom ? custom : 1;
          if ($('tr')[_custom]) {
            const nested_url = $('tr')[_custom].children[2].children[3].attribs.href;
            const name = $('tr')[_custom].children[2].children[1].children[1].children[0].data;
            const seeds = $('tr')[_custom].children[4].children[0].data;
            return this.http.get<any[]>('https://proxytpb.pw' + nested_url, { responseType: 'text' as 'json' })
            .subscribe(nested_response => {
              const _$ = cheerio.load(nested_response);
              const magnet = _$('.download')[0].children[1].attribs.href;
              return observer.next({
                name: name.trim(),
                seeds: seeds,
                magnet: magnet
              });
            });
          } else {
            return observer.next();
          }
        });
    });
  }



  // retrieveTorrentsList(show: string, episode: string) {
  //   show = show.replace(/'/g, ' ');
  //   const url = encodeURI('https://idope.se/torrent-list/' + show + ' ' + episode);

  //   // console.log('url', url);
  //   return Observable.create(observer => {
  //     return this.http.get < any[] > (url, { responseType: 'text' as 'json' })
  //       .subscribe(response => {
  //         const $ = cheerio.load(response);

  //         for (let i = 1; i < 4; i++) {
  //           // console.log($('.resultdiv')[i]);
  //           if ($('.resultdiv')[i]) {
  //             const magnet = 'magnet:?xt=urn:btih:' +
  //               $('.resultdiv')[i].children[3].children[11].children[0].data + '&dn=' +
  //               $('.resultdiv')[i].children[3].children[13].children[0].data +
  //               $('#hidetrack')[0].attribs.value;

  //             observer.next({
  //               name: $('.resultdiv')[i].children[1].children[5].children[0].children[0].data.trim(),
  //               seeds: $('.resultdiv')[i].children[3].children[7].children[3].children[0].data,
  //               size: $('.resultdiv')[i].children[3].children[5].children[3].children[0].data,
  //               magnet: magnet
  //             });
  //           } else {
  //             return observer.next();
  //           }
  //         }

  //       });
  //   });
  // }
  retrieveTorrentsList(show: string, episode: string) {
    show = show.replace(/'/g, ' ');
    const url = encodeURI('https://indiaproxy.in/s/?q=' + show + ' ' + episode);
    console.log('Retrieving episode', show, episode);
    // console.log('url', url);
    return Observable.create(observer => {
      return this.http.get<any[]>(url, { responseType: 'text' as 'json' })
        .subscribe(response => {
          const $ = cheerio.load(response);
          for(let i = 1; i < 4; i++) {
            if ($('tr')[i]) {
              const nested_url = $('tr')[i].children[2].children[3].attribs.href;
              const name = $('tr')[i].children[2].children[1].children[1].children[0].data;
              const seeds = $('tr')[i].children[4].children[0].data;
              let size = $('tr')[i].children[2].children[7].children[0].data;
              size = size.substring(
                  size.lastIndexOf('Size ') + 5,
                  size.lastIndexOf('iB')
              );
              size += 'b';
              const sub = this.http.get<any[]>('https://proxytpb.pw' + nested_url, { responseType: 'text' as 'json' })
              .subscribe(nested_response => {
                const _$ = cheerio.load(nested_response);
                const magnet = _$('.download')[0].children[1].attribs.href;
                // sub.unsubscribe();
                return observer.next({
                  name: name.trim(),
                  seeds: seeds,
                  size: size,
                  magnet: magnet
                });
              });
            } else {
              return observer.next();
            }
          }

        });
    });
  }

  searchShows(show_string: string): Observable < any > {
    return Observable.create(observer => {
      return this.http.get < any[] > ('https://trakt.tv/search/shows?query=' + show_string, { responseType: 'text' as 'json' })
        .subscribe(response => {
          const $ = cheerio.load(response);
          let hasResults = false;
          $('.grid-item')
            .filter((i, result) => {
              console.log('has results');
              hasResults = true;
              if (i < 6) {
                let dashed_title = result.children[1]['attribs']['href'];
                if (dashed_title) {
                  dashed_title = dashed_title.split('/shows/')[1];
                  // console.log('Found titles =>', dashed_title);
                  return observer.next(dashed_title);
                }
              }
            });

          setTimeout(function() {
            if (!hasResults) {
              return observer.next();
            }
          }, 2000);
        });
    });
  }


}

