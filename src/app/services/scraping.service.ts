import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import 'rxjs/observable/of';
import {HttpClient} from '@angular/common/http';
import * as cheerio from 'cheerio';
import * as moment from 'moment';
import {DbService} from './db.service';
import {ElectronService} from 'ngx-electron';

@Injectable()
export class ScrapingService {

  private path = this.electronService.remote.getGlobal('path');
  private app = this.electronService.remote.getGlobal('app');
  private fsExtra = this.electronService.remote.getGlobal('fsExtra');
  private request = this.electronService.remote.getGlobal('request');

  constructor(
    private http: HttpClient,
    private dbService: DbService,
    public electronService: ElectronService
  ) {
  }

  normalizePath(path) {
    path = this.path.normalize(path);
    path = path.replace(/\\/g, '/');
    return path;
  }

  retrieveShow(show: string): Observable<any> {
    const _show = show;
    return new Observable(observer => {
      return this.http.get<any[]>('https://trakt.tv/shows/' + _show, {responseType: 'text' as 'json'})
        .subscribe(response => {
          const $ = cheerio.load(response, {_useHtmlParser2: true});
          const dashed_title = _show;
          let title = $('#summary-ratings-wrapper')['0'].next.children[0].children[0].children[1].children[0].children[0].data;
          title = title ? title.trim() : '';

          const seasons = $('.season-count')[1] ? $('.season-count')[1].attribs['data-all-count'] : 0;
          const genres = $('#overview')['0'].children[2].children[0].children[0].children[6] ?
            $('#overview')['0'].children[2].children[0].children[0].children[6].children : [];
          const premiered = $('#overview')['0'] && $('#overview')['0'].children[2].children[0].children[1].children[2] &&
          $('#overview')['0'].children[2].children[0].children[0].children[1].children[2].attribs ?
            $('#overview')['0'].children[2].children[0].children[0].children[1].children[2].attribs.content : '';
          // console.log($('#overview'));
          const overview = $('#overview')[1].children[0] && $('#overview')[1].children[0].children[0] ? $('#overview')[1].children[0].children[0].data : '';
          const trailer = $('.affiliate-links')['0'].children[0] ? $('.affiliate-links')['0'].children[0].children[1].attribs.href : '';
          const wallpaper = $('#summary-wrapper')['0'].attribs['data-fanart'];
          const poster = this.retrievePoster(_show);
          const genresArray = [];
          const rating = $('#summary-ratings-wrapper .row .ratings li')[0].children[0].attribs.content;
          const year = $('.container.summary .container .row h1 span')[0].children[0].data;
          let network = $('.additional-stats')['0'].children[0].children[4] ? $('.additional-stats')['0'].children[0].children[4].data : '';
          let runtime = $('#overview')['0'].children[2].children[0].children[0].children[2] ?
            $('#overview')['0'].children[2].children[0].children[0].children[2].children[1].data : '';

          network = network.split(' on ');
          network = network[1];
          runtime = runtime ? runtime.split(' mins').join('') : '';
          genres.filter((genre, i) => {
            if (i % 2 && i !== 0 && genre.children) {
              genresArray.push(genre.children[0].data);
            }
          });
          poster.subscribe(resPoster => {
            return observer.next({
              title,
              dashed_title,
              network,
              premiered,
              runtime,
              genres: genresArray,
              overview,
              trailer,
              poster: resPoster,
              wallpaper,
              seasons,
              rating,
              year,
              Seasons: {}
            });
          });
        });
    });
  }

  retrieveShowSeason(show, season): Observable<any> {
    return new Observable(observer => {
      return this.http.get<any[]>('https://trakt.tv/shows/' + show + '/seasons/' + season, {responseType: 'text' as 'json'})
        .subscribe(response => {
          const $ = cheerio.load(response, {_useHtmlParser2: true});
          const episodes = [];
          let ep_label = '';
          let ep_title = '';
          let ep_date = '';
          let ep_overview = '';
          $('.titles').filter((i, episode) => {
            if (episode.children[0].name === 'h3') {
              ep_label = episode.children[0].children[1] ? episode.children[0].children[1].children[0].children[0].data :
                episode.children[0].children[0].children[0].children[0].data;
              ep_title = (episode.children[0].children[0] && episode.children[0].children[0].children[2].children[0]) ?
                episode.children[0].children[0].children[2].children[0].data : '';
              ep_date = episode.children[1].children[0].children[0].attribs['data-date'];
              if (episode.children[1].children[0].children[2]) {
                ep_date = episode.children[1].children[0].children[2].attribs['data-date'];
              }
              // Format episode label
              if (ep_label.indexOf('x') === 1) {
                ep_label = 'S0' + ep_label;
              } else {
                ep_label = 'S' + ep_label;
              }
              ep_label = ep_label.slice(0, ep_label.indexOf('x')) + 'E' + ep_label.slice(ep_label.indexOf('x') + 1, ep_label.length);

              if (ep_date) {
                ep_date = ep_date.substring(0, 10);
              }
              if (!ep_date) {
                ep_date = '';
              }

              ep_overview = episode.parent.children[1].children[0] ? episode.parent.children[1].children[0].data : '';
              // console.log('Overview', episode.parent.children[1].children[0] ? episode.parent.children[1].children[0].data : '');

              episodes.push({
                label: ep_label,
                title: ep_title,
                date: ep_date,
                overview: ep_overview
              });
            }
          });
          return observer.next(episodes);
        });
    });
  }

  retrieveCalendar(): Observable<any> {
    return new Observable(observer => {
      return this.retrieveRemoteCalendar(observer);
    });
  }

  retrieveRemoteCalendar(observer: any) {
    const lastWeek = moment().subtract(6, 'days').format('YYYY-MM-DD');
    return this.http.get<any[]>('https://trakt.tv/calendars/shows/' + lastWeek, {responseType: 'text' as 'json'})
      .subscribe(response => {
        const $ = cheerio.load(response, {_useHtmlParser2: true});
        const week = [];
        console.log('Week', lastWeek);
        $('.fanarts, .calendar-list').filter((i, result) => {
          const dotm = result.children[0].children[0].children[0].data;
          const month = result.children[0].children[1].children[0].data;
          let year = Number(moment().format('YYYY'));
          if (moment().month() === 11 && month === 'January') {
            year = +year;
          }
          const date = moment(year + ' ' + month + ' ' + dotm, 'YYYY MMM DD').format('DD-MM-YYYY');
          const day = {
            date,
            shows: []
          };
          for (i = 1; i < result.children.length; i++) {
            if (result.children[i].attribs['data-episode-id']) {
              let episode;
              let network;
              let title;
              const poster = result.children[i].children[1].children[0].children[1].attribs['data-original'];
              if (result.children[i].children[1].children[0].children.length === 7) {
                if (result.children[i].children[1].children[0].children[6].children.length === 8) {
                  title = result.children[i].children[1].children[0].children[6].children[7].children[0].attribs['content'];
                  episode = result.children[i].children[1].children[0].children[6].children[3].children[0].children[0].data;
                  network = result.children[i].children[1].children[0].children[6].children[2].children[0].data;
                  // console.log(title, 'Season premiere');
                } else {
                  title = result.children[i].children[1].children[0].children[6].children[6].children[0].attribs['content'];
                  episode = result.children[i].children[1].children[0].children[6].children[2].children[0].children[0].data;
                  network = result.children[i].children[1].children[0].children[6].children[1].children[0].data;
                }
              } else {
                const _result = result.children[i].children[1].children[0].children[5];
                switch (_result.children.length) {
                  case 9:
                    // console.log('9', _result);
                    title = _result.children[3].children[0].data;
                    network = _result.children[2].children[0].data;
                    episode = _result.children[4].children[0].children[0].data;
                    // console.log(title, network, episode, 'Season Finale');
                    break;
                  case 8:
                    // console.log('8', _result);
                    title = _result.children[2].children[0].data;
                    network = _result.children[1].children[0].data;
                    episode = _result.children[4].children[0] ? _result.children[4].children[0].children[0].data :
                      _result.children[3].children[0].children[0].data;
                    // console.log(title, network, episode, 'Season Finale');
                    break;
                  case 7:
                    // console.log('7', _result);
                    title = _result.children[1].children[0].data;
                    // network = _result.children[1].children[0].data;
                    episode = _result.children[2].children[0].children[0].data;
                    // console.log(title, episode, 'Season Finale');
                    break;
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
                title,
                dashed_title,
                episode,
                network,
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
          if (day.shows.length > 0) {
            week.push(day);
          }
        });

        // Finally
        return observer.next(week);
      });

  }

  retrievePoster(dashed_title: string): Observable<any> {
    return new Observable(observer => {
      const posterPath = this.path.join(this.app.getPath('appData'), 'Cereal', 'posters', dashed_title + '.jpg');
      if (this.fsExtra.pathExistsSync(posterPath)) {
        return observer.next(this.normalizePath(posterPath));
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

  retrieveRemotePoster(dashed_title: string, observer) {
    console.log('Retrieving poster for', dashed_title);
    return this.http.get('https://trakt.tv/shows/' + dashed_title, {responseType: 'text'})
      .subscribe(response => {
        const $ = cheerio.load(response, {_useHtmlParser2: true});
        const results = $('.poster');
        const poster = results[0].children[1].attribs['data-original'];

        console.log(dashed_title, poster);
        let path = this.path.join(this.app.getPath('appData'), 'Cereal', 'posters');
        this.fsExtra.mkdirsSync(path);
        path = this.path.join(path, dashed_title + '.jpg');
        if (!this.fsExtra.pathExistsSync(path)) {
          this.request({
            url: poster,
            encoding: null
          }, (err, data) => {
            if (err) {
              console.error('err', err);
            }
            if (data) {
              this.fsExtra.outputFileSync(path, data.body);
              path = this.normalizePath(path);
              return observer.next(path);
            } else {
              return observer.next();
            }
          });

        } else {
          path = this.normalizePath(path);
          return observer.next(path);
        }


      });
  }

  retrieveRemoteWallpaper(dashed_title: string): Observable<any> {
    return new Observable(observer => {
      console.log('Retrieving poster for', dashed_title);
      this.http.get('https://trakt.tv/shows/' + dashed_title, {responseType: 'text'})
        .subscribe(response => {
          const $ = cheerio.load(response, {_useHtmlParser2: true});
          const results = $('#summary-wrapper')['0'].attribs['data-fanart'];
          const wallpaper = results;

          console.log(dashed_title, wallpaper);
          let path = this.path.join(this.app.getPath('appData'), 'Cereal', 'wallpapers');
          this.fsExtra.mkdirsSync(path);
          path = this.path.join(path, dashed_title + '.jpg');
          if (!this.fsExtra.pathExistsSync(path)) {
            const that = this;
            that.request({
              url: wallpaper,
              encoding: null
            }, function (err, data) {
              if (err) {
                console.error('err', err);
              }
              that.fsExtra.outputFileSync(path, data.body);
              path = that.normalizePath(path);
              return observer.next(path);
            });

          } else {
            path = this.normalizePath(path);
            return observer.next(path);
          }

        });
    });
  }

  // PB proxy
  retrieveEpisode(show: string, episode: string): Observable<any> {
    show = show.replace(/'/g, '');
    show = show.replace(/&/g, 'and');
    const url = encodeURI('https://thepiratebay10.org/search/' + show + ' ' + episode + '/1/99/0');
    console.log('Downloading episode', show, episode);
    console.log('url', url);
    return new Observable(observer => {
      this.http.get<any[]>(url, {responseType: 'text' as 'json'})
        .subscribe(response => {
          const $ = cheerio.load(response, {_useHtmlParser2: true});
          const _custom = 1;
          if ($('tr')[_custom]) {
            const dn = $('tr')[_custom].children[3].children[1].children[1].children[0].data;
            const magnetURI = $('tr')[_custom].children[3].children[3].attribs.href;
            const seeds = $('tr')[_custom].children[5].children[0].data;
            let size = $('tr')[_custom].children[3] ? $('tr')[_custom].children[3].children[7].children[0].data : '';
            if (size) {
              size = size ? size.substring(
                size.lastIndexOf('Size ') + 5,
                size.lastIndexOf('iB')
              ) : '';
              size += 'b';
            } else {
              size = '-';
            }

            observer.next({
              dn: dn.trim(),
              seeds,
              size,
              magnetURI
            });
          } else {
            observer.next();
          }
        });
    });
  }

  // Kickass
  // retrieveEpisode(show: string, episode: string, custom?: number) {
  //   show = show.replace(/'/g, ' ');
  //   const url = encodeURI('https://kickass.soy/usearch/' + show + ' ' + episode + '/?field=seeders&sorder=desc');
  //   console.log('Downloading episode', show, episode);
  //   // console.log('url', url);
  //   return new Observable(observer => {
  //     return this.http.get<any[]>(url, { responseType: 'text' as 'json' })
  //       .subscribe(response => {
  //                 const $ = cheerio.load(response, { _useHtmlParser2: true });

  //         const _custom = custom ? custom : 1;
  //         if ($('#torrent_latest_torrents')[_custom]) {
  //           const t_row = $('#torrent_latest_torrents')[_custom];
  //           console.log(t_row);
  //           const name = t_row.children[1].children[3].children[5].children[1].children[0].data;
  //           const magnet_link = t_row.children[1].children[1].children[5].attribs['href'];
  //           const size = t_row.children[3].children[0].data;
  //           const seeds = t_row.children[7].children[0].data;
  //           const magnet = decodeURIComponent(magnet_link.split('https://mylink.me.uk/?url=')[1]);
  //           return observer.next({
  //             name: name.trim(),
  //             seeds: seeds,
  //             size: size,
  //             magnet: magnet
  //           });
  //         } else {
  //           return observer.next();
  //         }
  //       });
  //   });
  // }

  cleanShowTitle(show) {
    const year_regex = /[-]\d{4}(?!\d)/g;
    show = show.replace(/'/g, ' ');
    show = show.replace(year_regex, '');
    return show;
  }

  retrieveTorrentsList(show: string, episode: string) {
    show = show.replace(/'/g, '');
    show = show.replace(/&/g, 'and');
    const url = encodeURI('https://thepiratebay10.org/search/' + show + ' ' + episode + '/1/99/0');
    console.log('Retrieving episode', show, episode);
    console.log('url', url);
    return new Observable(observer => {
      return this.http.get<any[]>(url, {responseType: 'text' as 'json'})
        .subscribe(response => {
          const $ = cheerio.load(response, {_useHtmlParser2: true});
          if ($('tr').length === 0) {
            console.log('No results');
            return observer.next();
          }
          for (let i = 1; i < 4; i++) {
            if ($('tr')[i]) {
              const name = $('tr')[i].children[3].children[1].children[1].children[0].data;
              const magnetURI = $('tr')[i].children[3].children[3].attribs.href;
              const seeds = $('tr')[i].children[5].children[0].data;
              let size = $('tr')[i].children[3].children[7].children ? $('tr')[i].children[3].children[7].children[0].data : '';
              if (size) {
                size = size ? size.substring(
                  size.lastIndexOf('Size ') + 5,
                  size.lastIndexOf('iB')
                ) : '';
                size += 'b';
              } else {
                size = '-';
              }

              observer.next({
                name: name.trim(),
                seeds,
                size,
                magnetURI
              });
            }
          }

        }, reason => {
          console.error('Not found', reason);
          observer.next();
        });
    });
  }

  searchShows(show_string: string): Observable<any> {
    return new Observable(observer => {
      return this.http.get<any[]>('https://trakt.tv/search/shows?query=' + show_string, {responseType: 'text' as 'json'})
        .subscribe(response => {
          const $ = cheerio.load(response, {_useHtmlParser2: true});

          let hasResults = false;
          $('.grid-item')
            .filter((i, result) => {
              // console.log('has results');
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

          setTimeout(() => {
            if (!hasResults) {
              return observer.next();
            }
          }, 2000);
        });
    });
  }

  retrieveTrending(): Observable<any> {
    return new Observable(observer => {
      return this.http.get<any[]>('https://trakt.tv/shows/trending', {responseType: 'text' as 'json'})
        .subscribe(response => {
          const $ = cheerio.load(response, {_useHtmlParser2: true});

          const shows = [];
          $('.grid-item')
            .filter((i, result) => {
              const show = {};
              if (result.children[1] && result.children[1].attribs['href']) {
                show['dashed_title'] = result.children[1].attribs['href'].split('/shows/')[1];
                show['poster'] = this.retrievePoster(show['dashed_title']);
                if (result.children[1] && result.children[1].children[0]) {
                  show['title'] = result.children[1].children[0].children[5].children[1].children[0].data.trim();
                }
                show['year'] = result.children[1].children[0].children[5].children[1].children[1].children[0] ?
                  result.children[1].children[0].children[5].children[1].children[1].children[0].data : '-';
                show['rating'] = result.children[2].children[1].children[0].children[1].data;
                show['rating'] = show['rating'].substr(0, show['rating'].length - 1);
              }
              if (show['title']) {
                shows.push(show);
              }
            });
          observer.next(shows);
        });
    });
  }


}

