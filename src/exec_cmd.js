const { exec } = require('child_process')
const fs = require('fs');
var readline = require("readline");

var storj_ls_json = {'file_list' : []};
var local_files_upload_check_json = {'file_list' : []};
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
  console.log(`storj_ls_json: ${storj_ls_json}`);

  const local_files = fs.readdirSync('upload_files');
  console.log(`local_files: ${local_files}`);


  for (const local_file_name of local_files) {
    var stat = fs.statSync(`upload_files/${local_file_name}`);
    console.log(`local file_name: ${local_file_name}; size: ${stat.size}`);
    //console.log(storj_ls_json);
    for (const storj_file of storj_ls_json.file_list) {
      console.log(`${storj_file.file_name}, ${local_file_name} ${storj_file.file_size} ${stat.size}`)
      if(storj_file.file_name == local_file_name && storj_file.file_size == stat.size ) {
        console.log("uploaded");
        local_files_upload_check_json.file_list.push(local_file_name);
        break;
      }
    }
  }

  console.log(`local_files_upload_check_json.file_list: ${JSON.stringify(local_files_upload_check_json.file_list, null, 2)}`);

});

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