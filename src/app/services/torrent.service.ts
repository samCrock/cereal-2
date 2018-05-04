import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Rx';
import { ElectronService } from 'ngx-electron';
import { Subject } from 'rxjs/Subject';

@Injectable()
export class TorrentService {

	private wt_client = this._electronService.remote.getGlobal('wt_client');
	private local_path = this._electronService.remote.getGlobal('local_path');
	
	constructor(private _electronService: ElectronService) {}

	addTorrent(episode_torrent: Object): number {
		if (!this.wt_client.get(episode_torrent['magnet'])) {
			this.wt_client.add(episode_torrent['magnet'], {
				path: this.local_path + '\\Downloads\\Cereal\\' + episode_torrent['show'] + '\\' + episode_torrent['episode']
			});
			return 1;
		} else {
			// console.log('Already here');
			return 0;
		}
	}

	getTorrents() {
		return this.wt_client.torrents;
	}

	getTorrent(infoHash): Observable<any> {
		return new Observable(observer => {
			this.wt_client.torrents.forEach(t => {
				if (!t) { return observer.next(); }
				if (t['infoHash'] === infoHash) {
					return observer.next(t);
				}
			});
		});
	}

	removeTorrent(infoHash) {
		if (this.wt_client.get(infoHash)) {
			this.wt_client.remove(infoHash);
		}
	}

	getClient() {
		return this.wt_client;
	}





}