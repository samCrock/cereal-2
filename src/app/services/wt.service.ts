import { Injectable } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

@Injectable()
export class WtService {

  private wt = this._electronService.remote.getGlobal('wt');
  private clientSubject: BehaviorSubject<any>;

  constructor(private _electronService: ElectronService) {
    this.clientSubject = new BehaviorSubject<any>(this.wt);
  }

  getClient(): BehaviorSubject<any> {
    return this.clientSubject;
  }

  restartClient() {
    // const client = this.clientSubject.getValue();
    // const torrents = client.torrents;
    // client.destroy(callback => {
    //   console.log('WT client destroyed. Restarting..');
    //   const newClient = new this.wt();
    //   torrents.forEach(t => {
    //     newClient.add(t.magnetURI);
    //   });
    //   console.log('Restored torrents', newClient.torrents);
    //   this.clientSubject.next(newClient);
    // });
  }

}
