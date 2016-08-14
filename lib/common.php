<?php
    require_once 'lib/db.inc.php';
    require 'vendor/autoload.php';
    
    define ("ROOT_DIR",dirname(str_replace("\\","/",dirname(__FILE__))."../"));
    use Namshi\JOSE\SimpleJWS;

    $tok_user = "";
    try{
        $id = "";
        if(isset($_SERVER['HTTP_AUTHORIZATION'])){
            $id = substr($_SERVER['HTTP_AUTHORIZATION'],strlen("Bearer "));
        }
        $jws        = SimpleJWS::load($id);
        $public_key = openssl_pkey_get_public("file://".ROOT_DIR."/file/ec256-key-pub.pem");
        if ($jws->isValid($public_key, 'ES256')) {
            $payload = $jws->getPayload();
            $tok_user = $payload['uid'];
        }else{
            //NO OP
        }
    }catch(Exception $e){
    }
    //JWTの認証に通っていれば、$tok_userに入っている。

function getToken($username){
    $date       = new DateTime('+7 days');
    $sign = ["username"=>$username];    
    $jws  = new SimpleJWS(array(
        'alg' => 'ES256',
        'exp' => $date->format('U')
    ));
    $jws->setPayload(array(
        'uid' => $sign,
    ));
    //echo ROOT_DIR;
    $privateKey = openssl_pkey_get_private("file://".ROOT_DIR."/file/ec256-key-pri.pem","");
    $jws->sign($privateKey);
    return $jws->getTokenString();
}
function sanitizeStr($str){
    $str = stripslashes($str);
    $str = str_replace("'","''",$str);
    $str = str_replace("%","\%",$str);
    return $str;
}
function sanitizeStr4Lookup($str){
    $str = stripslashes($str);
    $str = str_replace("'","\'",$str);
    $str = str_replace("%","\%",$str);
    $str = str_replace("*","%",$str);
    return $str;
}

function json_header(){
    header('Content-Type: application/json');
}

function json_response($ret){
    json_header();
    print json_encode($ret);
}
function json_error($msg){
    $err = ['error'=>$msg];
    json_response($err);
    die;
}
?>