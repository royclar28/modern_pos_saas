<?php

namespace App\Exceptions;

use Exception;

class PlanLimitExceededException extends Exception
{
    public function __construct(string $message = "Has alcanzado el límite de tu plan.")
    {
        parent::__construct($message);
    }
}
