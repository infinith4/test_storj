const { exec } = require('child_process')
const fs = require('fs');
var readline = require("readline");

var storj_ls_json = {'file_list' : []};

cmd  = 'rclone ls storj:test-bucket'
exec(cmd, (err, stdout, stderr) => {
  //exec('ls -l sample.txt', (err, stdout, stderr) => {
  if (err) {
    console.log(`${cmd}; stderr: ${stderr}`)
    return
  }
  console.log(`${cmd}; stdout: ${stdout}`)
  const ls_stdout = stdout.split(/\n/);
  console.log(ls_stdout);
  for (const line of ls_stdout) {
    if(line !== '') {
      storj_ls_json.file_list.push({ 'file_size': Number(line.trim().split(/\s/)[0]), 'file_name': line.replace(/\s*\d+/, '').trim()});
      console.log(Number(line.trim().split(/\s/)[0]));
      console.log(line.replace(/\s*\d+/, '').trim());
    }
  }
  console.log(storj_ls_json);
});

const local_files = fs.readdirSync('upload_files');
console.log(local_files)

// for (const local_filename of local_files) {
//   for (const storj_filename of storj_files) {

//     var stat = fs.statSync(`upload_files/${filename}`);
//     console.log(`filename: ${filename}; size: ${stat.size}`);
//   }
// }

// for (const filename of files) {
//   exec(`rclone copy ./upload_files/${filename} storj:test-bucket/`, (err, stdout, stderr) => {
//       if (err) {
//         console.log(`stderr: ${stderr}`)
//         return
//       }
//       console.log(`stdout: ${stdout}`)
//   });
// }
// console.log('わくわくBank')