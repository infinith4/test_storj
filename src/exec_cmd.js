const { exec } = require('child_process')
const fs = require('fs');
var readline = require("readline");
const path = require('path')

const source_upload_dir = process.env.SOURCE_UPLOAD_DIR;
const upload_bucket_name = process.env.UPLOAD_BUCKET_NAME;
const ignore_file_name_list = process.env.IGNORE_FILE_NAME_LIST.split(",");
console.log(ignore_file_name_list);

var storj_ls_json = {'file_list' : []};
var local_files_json = {'file_list' : []};
var local_files_upload_check_json = {'file_list' : []};
//storj のBucket内の一覧を取得
cmd  = `rclone ls storj:${upload_bucket_name}`
exec(cmd, (err, stdout, stderr) => {
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
  //ローカルのファイル一覧を取得
  //const local_files = fs.readdirSync(source_upload_dir);
  const listFiles = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap(dirent =>
      dirent.isFile() ? [`${dir}/${dirent.name}`] : listFiles(`${dir}/${dirent.name}`)
    )
  const local_files = listFiles(source_upload_dir);
  console.log(`local_files----: ${local_files}`);


  for (const local_file_path of local_files) {
    //無視するファイルが含まれている場合は処理をスキップ
    let local_file_name = path.basename(local_file_path);
    console.log(`local_file_path: ${local_file_path} includes ignore_file_name_list: ${ignore_file_name_list.includes(local_file_name)}`)
    if(ignore_file_name_list.includes(local_file_name)){
      continue;
    }

    var stat = fs.statSync(`${local_file_path}`);
    console.log(`local_file_path: ${local_file_path}; size: ${stat.size}`);
    local_files_json.file_list.push(local_file_path);

    for (const storj_file of storj_ls_json.file_list) {
      console.log(`storj_file.file_name: ${storj_file.file_name},local_file_path: ${local_file_path},storj_file.file_size: ${storj_file.file_size},stat.size: ${stat.size},`)

      const root_dir_name = local_file_path.split("/")[0];
      const local_file_path_remove_source_dir = local_file_path.replace(`${root_dir_name}/`, "");
      if(storj_file.file_name == local_file_path_remove_source_dir && storj_file.file_size == stat.size ) {
        console.log("uploaded");
        local_files_upload_check_json.file_list.push(local_file_path);
        break;
      }
    }
  }

  console.log(`local_files_upload_check_json.file_list: ${JSON.stringify(local_files_upload_check_json.file_list, null, 2)}`);

  upload_file_list = local_files_json.file_list.filter((val) => !local_files_upload_check_json.file_list.includes(val));
  console.log(`upload_file_list: ${upload_file_list}`);

  for (const upload_file_path of upload_file_list) {
    const root_dir_name = upload_file_path.split("/")[0];
    const remote_file_path = upload_file_path.replace(`${root_dir_name}/`, "");
    console.log(`remote_file_path: ${remote_file_path}`);
    let remote_dir_path = path.dirname(remote_file_path);
    let remote_file_name = path.basename(remote_file_path);
    if(remote_file_name)
    if(remote_dir_path === "."){
      remote_dir_path = ""
    }

    //無視するファイルが含まれている場合は処理をスキップ
    console.log(`includes ignore_file_name_list: ${ignore_file_name_list.includes(remote_file_name)}`)
    if(ignore_file_name_list.includes(remote_file_name)){
      continue;
    }
    
    console.log(`remote_dir_path: ${remote_dir_path}`);
    
    //ファイルをコピーする
    const copy_file_log = `copy '${upload_file_path}' to storj:'${upload_bucket_name}/${remote_dir_path}':`;  
    console.log(copy_file_log);
    exec(`rclone copy --progress '${upload_file_path}' storj:'${upload_bucket_name}/${remote_dir_path}'`, (err, stdout, stderr) => {
      if (err) {
          console.log(`rclone copy stderr. ${copy_file_log}: ${stderr}`)
          return
        }
        console.log(`rclone copy stdout. ${copy_file_log}: ${stdout}`)
    });
  }

  // console.log("------------------")
  // cmd  = `rclone ls storj:${upload_bucket_name}`
  // exec(cmd, (err, stdout, stderr) => {
  //   //exec('ls -l sample.txt', (err, stdout, stderr) => {
  //   if (err) {
  //     console.log(`${cmd}; stderr: ${stderr}`)
  //     return
  //   }
  //   console.log(`${cmd}; stdout: ${stdout}`)
  // });

  // // exec(`rclone mkdir storj:backup-bucket/GoogleDrive`, (err, stdout, stderr) => {
  // //   if (err) {
  // //     console.log(`rclone mkdir stderr: ${stderr}`)
  // //     return
  // //   }
  // //   console.log(`rclone mkdir stdout: ${stdout}`);

  // // });

  //     // //ファイルをコピーする
         // upload_files/GoogleDrive/.DS_Store ファイルを storj:backup-bucket/GoogleDrive/.DS_Store ディレクトリにコピーする
  //     exec(`rclone copy --progress 'upload_files/GoogleDrive/.DS_Store' storj:backup-bucket/GoogleDrive/.DS_Store`, (err, stdout, stderr) => {
  //       if (err) {
  //         console.log(`rclone copy stderr: ${stderr}`)
  //         return 
  //       }
  //       console.log(`rclone copy stdout: ${stdout}`)
  //     });
});