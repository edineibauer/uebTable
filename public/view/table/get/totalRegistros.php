<?php

use Config\Config;

(!empty($variaveis) && !empty($_SESSION["userlogin"])) || die;

$data['data'] = 0;
$entidade = $variaveis[0];
$setor = Config::getSetor();
$permissoes = $setor !== "admin" ? Config::getPermission($setor) : [];
if ($setor === "admin" || empty($permissoes[$entidade]) || (isset($permissoes[$entidade]['read']) && $permissoes[$entidade]['read'])) {
    $sql = new \Conn\SqlCommand(true, true);
    $sql->exeCommand("SELECT COUNT(*) as total FROM " . PRE . $entidade);
    $data['data'] = (int) ($sql->getResult() ? $sql->getResult()[0]['total'] : 0);
}