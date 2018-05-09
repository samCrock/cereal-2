import { HomeComponent } from './components/home/home.component';
import { ShowComponent } from './components/show/show.component';
import { PlayerComponent } from './components/player/player.component';
import { TorrentsComponent } from './components/torrents/torrents.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
    {
        path: '',
        component: HomeComponent
    },
    {
        path: 'show/:title',
        component: ShowComponent
    },
    {
        path: 'torrents',
        component: TorrentsComponent
    },
    {
        path: 'play',
        component: PlayerComponent
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true})],
    exports: [RouterModule]
})
export class AppRoutingModule { }
