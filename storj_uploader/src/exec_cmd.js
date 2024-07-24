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

    const root_dir_name = local_file_path.split("/")[0];
    const local_file_path_remove_source_dir = local_file_path.replace(`${root_dir_name}/`, "");

    // let local_file_path_remove_source_dir_path = path.dirname(local_file_path_remove_source_dir);
    // const regex_str = `/^${local_file_path_remove_source_dir_path}/`;
    // console.log(`${local_file_path}; regex_str: ${regex_str}; storj_ls_json.file_list: ${JSON.stringify(storj_ls_json.file_list[0], null, 2)}`)
    // console.log(storj_ls_json.file_list.filter(c => c.file_name.match(regex_str)));

    for (const storj_file of storj_ls_json.file_list) {
      //file size
      //console.log(`storj_file.file_name: ${storj_file.file_name},local_file_path: ${local_file_path},storj_file.file_size: ${storj_file.file_size},stat.size: ${stat.size},Is file_name and file size match: ${storj_file.file_name == local_file_path_remove_source_dir && storj_file.file_size == stat.size}`)
      if(storj_file.file_name == local_file_path_remove_source_dir) {
        console.log(`storj_file.file_name: ${storj_file.file_name},local_file_path: ${local_file_path}`)
        if(storj_file.file_size == stat.size){
          //LocalのファイルがUploadされているかチェックするためのリスト
          local_files_upload_check_json.file_list.push({'file_path': local_file_path, 'is_same_size': storj_file.file_size == stat.size});
          break;
        }else{
          
          //storj files
          console.log(`storj_file.file_name: ${storj_file.file_name}`);
          const storj_exist_regex_file_list = filterArray(storj_ls_json.file_list.map(c => c.file_name), `*${local_file_path_remove_source_dir}_*`)
          //同名のファイルのフォルダがない場合、アップロードする
          if(storj_exist_regex_file_list.length === 0){
            //LocalのファイルがUploadされているかチェックするためのリスト
            local_files_upload_check_json.file_list.push({'file_path': local_file_path, 'is_same_size': false});
            break;
          }

          console.log(`storj_exist_regex_file_list: ${storj_exist_regex_file_list}`)
          for(const storj_regex_file_path of storj_exist_regex_file_list){
            const storj_regex_file_list = storj_ls_json.file_list.find(({file_name}) => file_name === storj_regex_file_path);
            console.log(`storj_regex_file_path: ${storj_regex_file_path}, storj_regex_file_path.file_size: ${storj_regex_file_list.file_size}, ${fs.statSync(`${local_file_path}`).size}`)
            const is_same_exist_file_size = storj_regex_file_list.file_size === fs.statSync(`${local_file_path}`).size;
            //TODO: COPYフォルダがあるときに２回目実行がおかしい
            //LocalのファイルがUploadされているかチェックするためのリスト
            if(is_same_exist_file_size){
              local_files_upload_check_json.file_list.push({'file_path': local_file_path, 'is_same_size': is_same_exist_file_size});
              break;
            }
          }
        }
      }


    }
  }

  console.log(`local_file_count: ${local_file_count}; local_files_upload_check_json: ${local_files_upload_check_json.file_list.length}`);
  console.log(`Is local_file_count equales storj_ls_json.file_list.length: ${storj_ls_json.file_list.length == local_file_count}`);

  //console.log(`local_files_upload_check_json.file_list: ${JSON.stringify(local_files_upload_check_json.file_list, null, 2)}`);
  // const aaa = local_files_upload_check_json.file_list.filter(c => (c.file_path === val && c.is_same_size))
  // console.log(aaa)
  //LocalのファイルがUploadされているかチェックするためのリストでfile_pathが一致して is_same_size: trueならアップロードしない
  console.log(`local_files_json filter: ${!local_files_json.file_list.includes(val => local_files_upload_check_json.file_list.filter(c => (c.file_path === val && c.is_same_size).map(c => c.file_path)))}`);
  const upload_file_json = local_files_upload_check_json.file_list.length === 0 ? local_files_json.file_list : local_files_json.file_list.filter((val) => local_files_upload_check_json.file_list.filter(c => (c.file_path === val && c.is_same_size)).map(c => c.file_path))
  if(upload_file_json.length > 0){
    console.log(`upload_file_json: ${JSON.stringify(upload_file_json, null, 2)}`);
  }else{
    console.log(`upload_file_json count is 0`);
  }

  for (const upload_file_val of upload_file_json) {
    const root_dir_name = upload_file_val.split("/")[0];
    const remote_file_path = upload_file_val.replace(`${root_dir_name}/`, "");
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
    const copy_file_log = `copy '${upload_file_val}' to storj:'${upload_bucket_name}/${remote_dir_path}':`;  
    console.log(copy_file_log);
    //同一のファイル名があり、アップロードできないときにコピーフォルダを作成している。
    let copy_dir = ""
    const upload_file = local_files_upload_check_json.file_list.find(c => c.file_path === upload_file_val);
    console.log(`upload_file: ${JSON.stringify(upload_file, null, 2)}`)
    if(upload_file != undefined && !upload_file.is_same_size){
      copy_dir = `/${remote_file_name}_${new Date().toISOString()}`;
    }
    //file upload
    const res_rclonecopycmd = await exec(`rclone copy --progress '${upload_file_val}' storj:'${upload_bucket_name}/${remote_dir_path}${copy_dir}'`);
    console.log(res_rclonecopycmd.stdout);
  }
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function convertWildcardStringToRegExp(expression) {
  var terms = expression.split('*');

  var trailingWildcard = false;

  var expr = '';
  for (var i = 0; i < terms.length; i++) {
      if (terms[i]) {
          if (i > 0 && terms[i - 1]) {
              expr += '.*';
          }
          trailingWildcard = false;
          expr += escapeRegExp(terms[i]);
      } else {
          trailingWildcard = true;
          expr += '.*';
      }
  }

  if (!trailingWildcard) {
      expr += '.*';
  }

  return new RegExp('^' + expr + '$', 'i');
}

function filterArray(array, expression) {
	var regex = convertWildcardStringToRegExp(expression);
	//console.log('RegExp: ' + regex);
	return array.filter(function(item) {
		return regex.test(item);
	});
}

for(upload_bucket_name of upload_bucket_name_list){
  main(upload_bucket_name).catch(e => console.log(e));
}
