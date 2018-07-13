import { Component, Input, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss'],
  providers: []
})

export class DialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

    save() {
      this.dialogRef.close(true);
    }

    close() {
        this.dialogRef.close(false);
    }

}



// @Component({
//   selector: 'dialog-overview-example',
//   templateUrl: 'dialog-overview-example.html',
//   styleUrls: ['dialog-overview-example.css'],
// })
// export class DialogOverviewExample {

//   animal: string;
//   name: string;

//   constructor(public dialog: MatDialog) {}

//   openDialog(): void {
//     let dialogRef = this.dialog.open(DialogOverviewExampleDialog, {
//       width: '250px',
//       data: { name: this.name, animal: this.animal }
//     });

//     dialogRef.afterClosed().subscribe(result => {
//       console.log('The dialog was closed');
//       this.animal = result;
//     });
//   }

// }
