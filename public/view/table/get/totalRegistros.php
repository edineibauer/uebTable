<?php

use Config\Config;
use Entity\Metadados;

(!empty($variaveis) && !empty($_SESSION["userlogin"])) || die;

$data['data'] = 0;
$entidade = $variaveis[0];
$setor = Config::getSetor();
$permissoes = $setor !== "admin" ? Config::getPermission($setor) : [];
if ($setor === "admin" || empty($permissoes[$entidade]) || (isset($permissoes[$entidade]['read']) && $permissoes[$entidade]['read'])) {
    $info = Metadados::getInfo($entidade);

    function _getEntitySystemBelow(string $mySystem, string $entitySystem, array $lista) {
        if($mySystem === $entitySystem) {
            /**
             * Meu usuário esta no mesmo nível de sistema que a entidade em questão
             */
            return $lista;

        } else {
            /**
             * Verifica se a entidade possui um sistema pai
             */
            $infoparent = Metadados::getInfo($entitySystem);
            if(!empty($infoparent['system'])) {
                /**
                 * Entidade possui um sistema pai, verifica se é o mesmo que o meu
                 */
                $lista[] = $entitySystem;
                return _getEntitySystemBelow($mySystem, $infoparent['system'], $lista);
            }

            return [];
        }
    }

    /**
     * restringe leitura a somente dados do system_id de acesso
     * Aplica regra recursiva sobre sistema pai
     */
    $queryLogic = "";
    if ($_SESSION["userlogin"]["setor"] !== "admin" && !empty($info['system'])) {

        // permite registros que não tem vinculos com nenhum sistema (criados pelo admin)
        $queryLogic .= ($queryLogic !== "" ? " AND " : "WHERE ") . "((system_id IS NULL AND system_entity IS NULL)";

        /**
         * Se não for um administrador e
         * tem um sistema vinculado
         */
        if (!empty($_SESSION["userlogin"]["system_id"])) {
            $mySystem = Metadados::getInfo($_SESSION["userlogin"]['setor']);

            //permite registros que estão vinculados ao meu sistema
            $queryLogic .= " OR (system_id = {$_SESSION["userlogin"]["system_id"]} AND system_entity = '{$mySystem['system']}')";

            //permite registros que estão abaixo do meu sistema
            $listaEntitySystemBelow = _getEntitySystemBelow($mySystem['system'], $info['system'], []);
            if (!empty($listaEntitySystemBelow)) {
                foreach ($listaEntitySystemBelow as $systemBelow)
                    $queryLogic .= " OR system_entity = '" . $systemBelow . "'";
            }
        }
        $queryLogic .= ")";
    }

    $sql = new \Conn\SqlCommand();
    $sql->exeCommand("SELECT COUNT(*) as total FROM " . $entidade . " " . $queryLogic);
    $data['data'] = (int)($sql->getResult() ? $sql->getResult()[0]['total'] : 0);
}
