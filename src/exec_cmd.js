const util = require('util');
const childProcess = require('child_process');
const exec = util.promisify(childProcess.exec);
const fs = require('fs');
let readline = require("readline");
const path = require('path')

const source_upload_dir = process.env.SOURCE_UPLOAD_DIR;
const upload_bucket_name_list = process.env.UPLOAD_BUCKET_NAME_LIST.split(",");
console.log(upload_bucket_name_list)
const ignore_file_name_list = process.env.IGNORE_FILE_NAME_LIST.split(",");
console.log(ignore_file_name_list);

async function main(upload_bucket_name){
  console.log(`---------upload_bucket_name: ${upload_bucket_name}--------------------`);
  let storj_ls_json = {'file_list' : []};
  let local_files_json = {'file_list' : []};
  let local_files_upload_check_json = {'file_list' : []};
  //storj のBucket内の一覧を取得
  cmd  = `rclone ls storj:${upload_bucket_name}`
  let res = await exec(cmd);

  const ls_stdout = res.stdout.split(/\n/);
  //console.log(ls_stdout);
  for (const line of ls_stdout) {
    if(line !== '') {
      storj_ls_json.file_list.push({ 'file_size': Number(line.trim().split(/\s/)[0]), 'file_name': line.replace(/\s*\d+/, '').trim()});
    }
  }
    
  //Bucket 内のファイル一覧
  console.log(`--------storj_ls_json-------: `);
  //console.log(JSON.stringify(storj_ls_json, null, 2));
  //console.log(`storj_ls_json.file_list.length: ${storj_ls_json.file_list.length}`)
  //ローカルのファイル一覧を取得
  //const local_files = fs.readdirSync(source_upload_dir);
  const listFiles = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap(dirent =>
      dirent.isFile() ? [`${dir}/${dirent.name}`] : listFiles(`${dir}/${dirent.name}`)
    )
  const local_files = listFiles(source_upload_dir);
  //console.log(`local_files----: ${local_files}`);

  const aaa = storj_ls_json.file_list.find(({file_name}) => file_name == "iCloud写真/IMG_8869.PNG");
  console.log(`aaa: ${JSON.stringify(aaa, null, 2)}`);
  const bbb = storj_ls_json.file_list.find(({file_name}) => file_name == "iCloud写真/IMG_9195.PNG");
  console.log(`bbb: ${JSON.stringify(bbb, null, 2)}`);

  let local_file_count = 0;
  
  for (const local_file_path of local_files) {
    //無視するファイルが含まれている場合は処理をスキップ
    let local_file_name = path.basename(local_file_path);
    //console.log(`local_file_path: ${local_file_path} includes ignore_file_name_list: ${ignore_file_name_list.includes(local_file_name)}`)
    if(ignore_file_name_list.includes(local_file_name)){
      continue;
    }
    local_file_count++;

    var stat = fs.statSync(`${local_file_path}`);
    //console.log(`local_file_path: ${local_file_path}; size: ${stat.size}`);
    local_files_json.file_list.push(local_file_path);

    for (const storj_file of storj_ls_json.file_list) {

      const root_dir_name = local_file_path.split("/")[0];
      const local_file_path_remove_source_dir = local_file_path.replace(`${root_dir_name}/`, "");
      //file size
      //console.log(`storj_file.file_name: ${storj_file.file_name},local_file_path: ${local_file_path},storj_file.file_size: ${storj_file.file_size},stat.size: ${stat.size},Is file_name and file size match: ${storj_file.file_name == local_file_path_remove_source_dir && storj_file.file_size == stat.size}`)
      if(storj_file.file_name == local_file_path_remove_source_dir) {
        //console.log("uploaded");
        local_files_upload_check_json.file_list.push({'file_path': local_file_path, 'is_same_size': storj_file.file_size == stat.size});
        break;
      }
    }
  }

  console.log(`local_file_count: ${local_file_count}`);
  console.log(`Is local_file_count equales storj_ls_json.file_list.length: ${storj_ls_json.file_list.length == local_file_count}`);

  //console.log(`local_files_upload_check_json.file_list: ${JSON.stringify(local_files_upload_check_json.file_list, null, 2)}`);

  const upload_file_json = local_files_upload_check_json.file_list.filter((val) => !(local_files_json.file_list.includes(val.file_path) && val.is_same_size))
  if(upload_file_json.length > 0){
    console.log(`upload_file_json: ${JSON.stringify(upload_file_json, null, 2)}`);
  }else{
    console.log(`upload_file_json count is 0`);
  }

  for (const upload_file_val of upload_file_json) {
    const root_dir_name = upload_file_val.file_path.split("/")[0];
    const remote_file_path = upload_file_val.file_path.replace(`${root_dir_name}/`, "");
    //console.log(`remote_file_path: ${remote_file_path}`);
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
    const copy_file_log = `copy '${upload_file_val.file_path}' to storj:'${upload_bucket_name}/${remote_dir_path}':`;  
    console.log(copy_file_log);
    let copy_dir = ""
    if(!upload_file_val.is_same_size){
      copy_dir = `/${remote_file_name}_${new Date().toISOString()}`;
    }
    const res_rclonecopycmd = await exec(`rclone copy --progress '${upload_file_val.file_path}' storj:'${upload_bucket_name}/${remote_dir_path}${copy_dir}'`);
    console.log(res_rclonecopycmd.stdout);
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
}

for(upload_bucket_name of upload_bucket_name_list){
  main(upload_bucket_name).catch(e => console.log(e));
}
