<?php

namespace Table;

use Conn\Read;
use Conn\SqlCommand;
use Entity\Entity;
use Entity\Dicionario;
use Helpers\Check;
use Helpers\Template;

class TableData extends Table
{
    private $limit;
    private $pagina;
    private $offset;
    private $order;
    private $filter;
    private $dados;
    private $orderAsc = false;
    private $response = false;
    private $total;
    private $count = 0;

    public function __construct($entity)
    {
        parent::__construct($entity);
    }

    /**
     * @param mixed $filter
     */
    public function setFilter($filter)
    {
        $this->filter = $filter;
    }

    /**
     * @param mixed $limit
     */
    public function setLimit($limit)
    {
        $this->limit = $limit;
    }

    /**
     * @param mixed $offset
     */
    public function setOffset($offset)
    {
        $this->offset = $offset;
    }

    /**
     * @param mixed $pagina
     */
    public function setPagina($pagina)
    {
        $this->pagina = $pagina;
    }

    /**
     * @param mixed $order
     */
    public function setOrder($order)
    {
        $this->order = $order;
    }

    /**
     * @param bool $orderAsc
     */
    public function setOrderAsc(bool $orderAsc)
    {
        $this->orderAsc = $orderAsc;
    }

    /**
     * @return mixed
     */
    public function getOffset()
    {
        return $this->offset;
    }

    /**
     * @return mixed
     */
    public function getDados()
    {
        $this->start();
        return $this->dados;
    }

    /**
     * @return bool
     */
    public function isResponse(): bool
    {
        $this->start();
        return $this->response;
    }

    /**
     * @return mixed
     */
    public function getTotal()
    {
        return $this->total;
    }

    /**
     * @return mixed
     */
    public function getPagination()
    {
        return (int)ceil($this->total / $this->limit);
    }

    /**
     * @return int
     */
    public function getCount(): int
    {
        return $this->count;
    }

    private function start()
    {
        if (parent::getEntity()) {

            $d = new Dicionario(parent::getEntity());

            $this->pagina = $this->pagina < 2 ? 1 : $this->pagina;
            $this->offset = ($this->pagina * $this->limit) - $this->limit;
            $where = parent::getWhere($d, $this->filter);
            $this->total = $this->getMaximo($where);

            $read = new Read();
            $read->exeRead(parent::getEntity(), $where . " " . $this->getOrder());
            if ($read->getResult()) {
                $this->count = $read->getRowCount();
                $this->response = true;

                $dados['status'] = !empty($st = $d->getInfo()['status']) ? $d->search($st)->getColumn() : null;
                $dados['entity'] = parent::getEntity();
                $dados['values'] = $this->readDataTable($read->getResult(), $dados['status']);
                $dados['buttons'] = $this->getButtons();

                $template = new Template('table');
                $this->dados = $template->getShow("tableContent", $dados);
            }

        }
    }

    private function readDataTable($data, $status)
    {
        $relation = json_decode(file_get_contents(PATH_HOME . "entity/general/general_info.json"), true);
        $fields = parent::getFields();
        $read = new Read();
        $sql = new SqlCommand();
        $tableData = [];

        foreach ($data as $i => $datum) {
            $tableData[$i]['tdInfo']['tableAllowPermission'] = Entity::checkPermission(parent::getEntity(), $datum['id']);
            $tableData[$i]['tdInfo']['id'] = $datum['id'];
            $tableData[$i]['tdInfo']['status'] = !empty($status) ? $datum[$status] : null;

            /* Realiza leitura em dados relacionais Multiplos */
            if (!empty($relation[parent::getEntity()]['belongsTo'])) {
                foreach ($relation[parent::getEntity()]['belongsTo'] as $bel) {
                    foreach ($bel as $belEntity => $belData) {
                        if (!empty($belData['datagrid'])) {
                            $datum[$belEntity] = "";
                            if (in_array($belData['key'], ['list_mult', 'selecao_mult', 'extend_mult', 'checkbox_mult'])) {

                                $sql->exeCommand("SELECT a.{$belData['relevant']} FROM " . PRE . $belEntity . " as a JOIN " . PRE . $belEntity . "_" . $belData['column'] . " as r 
                                ON r.{$belEntity}_id = a.id WHERE r." . parent::getEntity() . "_id = {$datum['id']}");
                                if ($sql->getResult()) {
                                    foreach ($sql->getResult() as $item)
                                        $datum[$belEntity] .= (!empty($datum[$belEntity]) ? "<br>" : "") . $item[$belData['relevant']];
                                }
                            } else {
                                $read->exeRead($belEntity, "WHERE {$belData['column']} = :bb", "bb={$datum['id']}");
                                if ($read->getResult())
                                    $datum[$belEntity] = $read->getResult()[0][$belData['relevant']];
                            }
                        }
                    }
                }
            }

            /* Para cada Dado (TD), aplica os filtros necessários */
            if (!empty($fields)) {
                foreach ($fields as $column => $info) {
                    if (in_array($info['format'], ['list_mult', 'selecao_mult', 'extend_mult', 'checkbox_mult'])) {
                        $datum[$column] = "";
                        $dd = new Dicionario($info['relation']);
                        $columnRelevation = $dd->getRelevant()->getColumn();

                        $sql->exeCommand("SELECT r.{$columnRelevation} FROM " . PRE . $info['relation'] . " as r JOIN " . PRE . parent::getEntity() . "_" . $column . " as s
                    ON s." . $info['relation'] . "_id = r.id WHERE s." . parent::getEntity() . "_id = {$datum['id']}");
                        if ($sql->getResult()) {
                            foreach ($sql->getResult() as $itemData)
                                $datum[$column] .= (!empty($datum[$column]) ? "<br>" : "") . $itemData[$columnRelevation];
                        }
                    }

                    $tableData[$i][$column] = $this->applyFilterToTd($datum[$column], $info);
                }
            }
        }

        return $tableData;
    }

    /**
     * Converte dados TD para uso no template table data
     * @param $value
     * @param array $fields
     * @return array
     */
    private function applyFilterToTd($value, array $fields)
    {
        return [
            'template' => $fields['template'],
            'style' => $fields['style'],
            'class' => $fields['class'],
            'format' => $fields['format'],
            'value' => $this->getValueFrom($fields['format'], $fields['relation'], $value)
        ];
    }

    /**
     * @param string $format
     * @param $relation
     * @param $value
     * @return string
     */
    private function getValueFrom(string $format, $relation, $value)
    {
        switch ($format) {
            case 'datetime':
                return !empty($value) ? date("H:i d/m/Y", strtotime($value)) : "";
            case 'date':
                return !empty($value) ? date("d/m/Y", strtotime($value)) : "";
            case 'source':
                return $this->getSourceValue($value);
            case 'valor':
                return !empty($value) ? "R$" . number_format($value, 2) : "";
            case 'percent':
                return !empty($value) ? $value . "%" : "";
            case 'cpf':
                return !empty($value) ? Check::mask($value, '###.###.###-##') : "";
            case 'cep':
                return !empty($value) ? Check::mask($value, '#####-###') : "";
            case 'cnpj':
                return !empty($value) ? Check::mask($value, '##.###.###/####-##') : "";
            case 'ie':
                return !empty($value) ? Check::mask($value, '###.###.###.###') : "";
            case 'list':
            case 'selecao':
            case 'extend':
            case 'extend_add':
            case 'checkbox_rel':
                return $this->getSingleRelationValue($value ?? 0, $relation);
            case 'tel':
                $lenght = strlen($value);
                $mask = ($lenght === 11 ? '(##) #####-####' : ($lenght === 10 ? '(##) ####-####' : ($lenght === 9 ? '#####-####' : '####-####')));
                return !empty($value) ? Check::mask($value, $mask) : "";
            default:
                return $value;
        }
    }

    /**
     * Obtém o valor de um Source
     * @param $value
     * @return mixed|string
     */
    private function getSourceValue($value)
    {
        if (!empty($value)) {
            $value = json_decode($value, true);

            if (preg_match('/^image\//i', $value[0]['type']))
                return str_replace('\\', '/', $value[0]['url']);

            return "";
        }

        return "";
    }

    /**
     * Obtém o valor relevante de uma relação simples
     * @param int $value
     * @param string $relation
     * @return string
     */
    private function getSingleRelationValue(int $value, string $relation)
    {
        if (!empty($relation) && !empty($value)) {
            $dic = new Dicionario($relation);
            $relev = $dic->getRelevant();
            $read = new Read();
            $read->exeRead($relation, "WHERE id = :ri", "ri={$value}");
            if ($read->getResult() && !empty($relev))
                return $read->getResult()[0][$relev->getColumn()];
        }

        return "";
    }

    /**
     * @param string
     * @return int
     */
    public function getMaximo(string $where): int
    {
        $read = new Read();
        $read->exeRead(PRE . parent::getEntity(), $where);
        return (int)$read->getRowCount();
    }

    /*
        private function commandWhere($comand)
        {
            switch ($comand['comando']) {
                case '=':
                    return ($comand['negado'] ? "!" : "") . "= '{$comand['value']}'";
                    break;
                case '>':
                    return ($comand['negado'] ? "<= " : "> ") . "'{$comand['value']}'";
                    break;
                case '<':
                    return ($comand['negado'] ? ">= " : "< ") . "'{$comand['value']}'";
                    break;
                case '>=':
                    return ($comand['negado'] ? "< " : ">= ") . "'{$comand['value']}'";
                    break;
                case '<=':
                    return ($comand['negado'] ? "> " : "<= ") . "'{$comand['value']}'";
                    break;
                case '^':
                    return ($comand['negado'] ? "NOT " : "") . "LIKE '{$comand['value']}%'";
                    break;
                case '$':
                    return ($comand['negado'] ? "NOT " : "") . "LIKE '%{$comand['value']}'";
                    break;

                default:
                    return ($comand['negado'] ? "NOT " : "") . "LIKE '%{$comand['value']}%'";
            }
        }

        private function checkCommandWhere($value)
        {
            $negado = false;
            $comand = "Like";

            if (preg_match('/^!/i', $value)) {
                $negado = true;
                $value = substr($value, 1);
            }

            if (preg_match('/^=/i', $value)) {
                $comand = "=";
                $value = substr($value, 1);
            } elseif (preg_match('/^>/i', $value)) {
                $comand = ">";
                $value = substr($value, 1);
            } elseif (preg_match('/^</i', $value)) {
                $comand = "<";
                $value = substr($value, 1);
            } elseif (preg_match('/^>=/i', $value)) {
                $comand = ">=";
                $value = substr($value, 2);
            } elseif (preg_match('/^<=/i', $value)) {
                $comand = "<=";
                $value = substr($value, 2);
            } elseif (preg_match('/^\^/i', $value)) {
                $comand = "^";
                $value = substr($value, 1);
            } elseif (preg_match('/\$$/i', $value)) {
                $comand = "$";
                $value = substr($value, 0, -1);
            }

            return array("negado" => $negado, "comando" => $comand, "value" => $value);
        }*/

    private function getOrder()
    {
        $order = "";
        $order .= ($this->order ? " ORDER BY {$this->order}" . ($this->orderAsc ? "" : " DESC") : "ORDER BY id DESC");
        $order .= ($this->limit || $this->offset ? " LIMIT " . ($this->offset ? "{$this->offset}, " : "") . ($this->limit ?? 1000) : "");

        return $order;
    }
}