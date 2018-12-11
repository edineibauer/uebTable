<?php

namespace Table;

use Conn\Read;
use Entity\Dicionario;
use Entity\Metadados;
use Helpers\Template;
use MatthiasMullie\Minify;

class Table
{
    private $entity;
    private $fields;
    private $search;
    private $buttons;
    private $maxColumn;

    /**
     * Table constructor.
     * @param string $entity
     */
    public function __construct(string $entity = "")
    {
        $this->maxColumn = 4;
        $this->setEntity($entity);
        $this->buttons = [
            "edit" => true,
            "delete" => true,
            "copy" => true,
            "status" => true
        ];
    }

    /**
     * @param mixed $entity
     */
    public function setEntity($entity)
    {
        $this->entity = $entity;
    }

    public function toggleButton(string $button)
    {
        if (isset($this->buttons[$button]))
            $this->buttons[$button] = !$this->buttons[$button];
    }

    /**
     * @param int $maxColumn
     */
    public function setMaxColumn(int $maxColumn)
    {
        $this->maxColumn = $maxColumn;
    }

    /**
     * @return array
     */
    public function getButtons(): array
    {
        return $this->buttons;
    }

    /**
     * @param mixed $search
     */
    public function setSearch($search)
    {
        $this->search = $search;
    }

    /**
     * @param mixed $fields
     */
    public function setFields($fields)
    {
        $this->fields = $fields;
    }

    /**
     * @return int
     */
    public function getMaxColumn(): int
    {
        return $this->maxColumn;
    }

    /**
     * @return mixed
     */
    protected function getFields()
    {
        if (empty($this->fields)) {

            $relevants = Metadados::getRelevantAll($this->entity);
            $relation = json_decode(file_get_contents(PATH_HOME . "entity/general/general_info.json"), true);
            $d = new Dicionario($this->entity);
            $info = $d->getInfo();

            // DataGrid Position
            for ($i = 1; $i < 7 + 1; $i++) {
                if ($meta = $d->search("datagrid", ['grid_relevant' => $i])) {
                    $column = $meta->getColumn();
                    $this->fields[$column]['nome'] = $meta->getNome();
                    $this->fields[$column]['class'] = $meta->getDatagrid()['grid_class'] ?? "";
                    $this->fields[$column]['style'] = $meta->getDatagrid()['grid_style'] ?? "";
                    $this->fields[$column]['template'] = $meta->getDatagrid()['grid_template'] ?? "";
                    $this->fields[$column]['format'] = $meta->getFormat();
                    $this->fields[$column]['relation'] = !empty($meta->getRelation()) ? $meta->getRelation() : null;
                } else {

                    // Check DataGrid Relation Position
                    if (!empty($relation[$this->entity]['belongsTo'])) {
                        foreach ($relation[$this->entity]['belongsTo'] as $bel) {
                            foreach ($bel as $belEntity => $belData) {
                                if (!empty($belData['datagrid']) && $belData['datagrid'] == $i) {
                                    $this->fields[$belEntity]['nome'] = ucwords(str_replace(['-', '_'], ' ', $belEntity));
                                    $this->fields[$belEntity]['class'] = $belData['grid_class_relational'] ?? "";
                                    $this->fields[$belEntity]['style'] = $belData['grid_style_relational'] ?? "";
                                    $this->fields[$belEntity]['template'] = $belData['grid_template_relational'] ?? "";
                                    $this->fields[$belEntity]['format'] = 'text';
                                    $this->fields[$belEntity]['relation'] = $belEntity;
                                }
                            }
                        }
                    }
                }
            }

            // Relevant Column
            foreach ($relevants as $relevant) {
                if (!empty($info[$relevant]) && $meta = $d->search($info[$relevant])) {
                    if (empty($this->fields) || (count($this->fields) < $this->maxColumn && !in_array($meta->getColumn(), array_keys($this->fields)))) {
                        $column = $meta->getColumn();
                        $this->fields[$column]['nome'] = $meta->getNome();
                        $this->fields[$column]['class'] = !empty($meta->getDatagrid()['grid_class']) ? $meta->getDatagrid()['grid_class'] : "";
                        $this->fields[$column]['style'] = !empty($meta->getDatagrid()['grid_style']) ? $meta->getDatagrid()['grid_style'] : "";
                        $this->fields[$column]['template'] = !empty($meta->getDatagrid()['grid_template']) ? $meta->getDatagrid()['grid_template'] : "";
                        $this->fields[$column]['format'] = $meta->getFormat();
                        $this->fields[$column]['relation'] = !empty($meta->getRelation()) ? $meta->getRelation() : null;
                    }
                }
            }
        }
        return $this->fields;
    }

    /**
     * @param mixed $entity
     * @return string
     */
    public function getShow($entity = null): string
    {
        if ($entity)
            $this->setEntity($entity);

        return $this->getTable();
    }

    /**
     * @param string $entity
     */
    public function show(string $entity)
    {
        echo $this->getShow($entity);
    }

    /**
     * @return string
     */
    protected function getEntity(): string
    {
        return $this->entity;
    }

    /**
     * @param string $entity
     * @return string
     */
    private function getTable(): string
    {
        $d = new Dicionario($this->entity);
        $read = new Read();
        $read->exeRead(PRE . $this->entity, $this->getWhere($d));
        $dados['total'] = $read->getRowCount();
        $dados['entity'] = $this->entity;
        $dados['entityName'] = ucwords(str_replace(["_", "-", "  "], [" ", " ", " "], $this->entity));
        $dados['header'] = $this->getFields();
        $dados['status'] = !empty($st = $d->getInfo()['status']) ? $d->search($st)->getNome() : null;
        $dados['buttons'] = $this->getButtons();

        if (!file_exists(PATH_HOME . "assetsPublic/tableCore.min.js")) {
            $minifier = new Minify\JS(file_get_contents(PATH_HOME . VENDOR . "table/public/assets/table.js"));
            $minifier->add(file_get_contents(PATH_HOME . VENDOR . "table/public/assets/pagination.js"));
            $minifier->minify(PATH_HOME . "assetsPublic/tableCore.min.js");
        }

        if (!file_exists(PATH_HOME . "assetsPublic/tableCore.min.css")) {
            $minifier = new Minify\JS(file_get_contents(PATH_HOME . VENDOR . "table/public/assets/table.css"));
            $minifier->minify(PATH_HOME . "assetsPublic/tableCore.min.css");
        }

        $template = new Template("table");
        return $template->getShow("table", $dados);
    }

    /**
     * @param Dicionario $d
     * @param array|null $filter
     * @return string
     */
    protected function getWhere(Dicionario $d, array $filter = null): string
    {
        $where = "WHERE id > 0";

        //filtro de tabela por owner
        if (!empty($d->getInfo()['publisher']) && $idP = $d->getInfo()['publisher']) {
            $metaOwner = $d->search($idP);
            if ($metaOwner->getFormat() === "owner" && $_SESSION['userlogin']['setor'] > 1)
                $where .= " && " . $metaOwner->getColumn() . " = {$_SESSION['userlogin']['id']}";
        }

        //filtro de tabela por lista de IDs
        $general = json_decode(file_get_contents(PATH_HOME . "entity/general/general_info.json"), true);
        if (!empty($general[$this->entity]['owner']) || !empty($general[$this->entity]['ownerPublisher'])) {
            foreach (array_merge($general[$this->entity]['owner'] ?? [], $general[$this->entity]['ownerPublisher'] ?? []) as $item) {
                $entityRelation = $item[0];
                $column = $item[1];
                $userColumn = $item[2];
                $tableRelational = PRE . $entityRelation . "_" . $this->entity . "_" . $column;

                $read = new Read();
                $read->exeRead($entityRelation, "WHERE {$userColumn} = :user", "user={$_SESSION['userlogin']['id']}");
                if ($read->getResult()) {
                    $idUser = $read->getResult()[0]['id'];

                    $read->exeRead($tableRelational, "WHERE {$entityRelation}_id = :id", "id={$idUser}");
                    if ($read->getResult()) {
                        $where .= " && (id = 0";
                        foreach ($read->getResult() as $item)
                            $where .= " || id = {$item["{$this->entity}_id"]}";
                        $where .= ")";
                    } else {
                        $where = "WHERE id < 0";
                    }
                }
            }
        }

        if (!empty($this->search) && is_string($this->search)) {
            $where .= " && (";
            foreach (['identifier', 'title', 'link', 'email', 'tel', 'cpf', 'cnpj', 'cep'] as $item) {
                if (!empty($d->getInfo()[$item]) && !empty($c = $d->search($d->getInfo()[$item]))) {
                    $where .= (isset($firstSearch) ? " || " : "") . PRE . $this->entity . ".{$c->getColumn()} LIKE '%{$this->search}%'";
                    $firstSearch = 1;
                }
            }
            $where .= ")";

        } elseif ($filter) {
            foreach ($filter as $item => $value)
                $where .= " && (" . ($item === "title" ? $d->getRelevant()->getColumn() : $d->search($item)->getColumn()) . " LIKE '%{$value}%' || id LIKE '%{$value}%')";
        }

        return $where;
    }
}
