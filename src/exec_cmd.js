const { exec } = require('child_process')
const fs = require('fs');
var readline = require("readline");
const source_upload_dir = process.env.SOURCE_UPLOAD_DIR;
const upload_bucket_name = process.env.UPLOAD_BUCKET_NAME;

var storj_ls_json = {'file_list' : []};
var local_files_json = {'file_list' : []};
var local_files_upload_check_json = {'file_list' : []};
cmd  = `rclone ls storj:${upload_bucket_name}`
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
    }
  }
  console.log(`--------storj_ls_json-------: `);
  console.log(JSON.stringify(storj_ls_json, null, 2));

  const local_files = fs.readdirSync(source_upload_dir);
  console.log(`local_files----: ${local_files}`);


  for (const local_file_name of local_files) {
    var stat = fs.statSync(`${source_upload_dir}/${local_file_name}`);
    console.log(`local file_name: ${local_file_name}; size: ${stat.size}`);

    local_files_json.file_list.push(local_file_name);

    console.log(`storj_file.file_name, local_file_name storj_file.file_size stat.size`)
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

  upload_file_list = local_files_json.file_list.filter((val) => !local_files_upload_check_json.file_list.includes(val));
  console.log(upload_file_list);

  for (const upload_file_name of upload_file_list) {
    console.log(`upload_file_name: ${upload_file_name}`);
    exec(`rclone copy './upload_files/${upload_file_name}' storj:${upload_bucket_name}`, (err, stdout, stderr) => {
        if (err) {
          console.log(`stderr: ${stderr}`)
          return
        }
        console.log(`stdout: ${stdout}`)
    });
  }
});