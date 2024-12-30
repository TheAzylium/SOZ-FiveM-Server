import { usePlayer } from '@public/nui/hook/data';
import { useRepository } from '@public/nui/hook/repository';
import { RepositoryType } from '@public/shared/repository';
import { useEffect, useState } from 'react';

import { NuiEvent } from '../../shared/event';
import { JobGrade, JobPermission, JobType } from '../../shared/job';
import { isOk, Result } from '../../shared/result';
import { fetchNui } from '../fetch';

export const useJobGrades = (): JobGrade[] => {
    const [jobGrades, setJobGrades] = useState<JobGrade[]>([]);

    useEffect(() => {
        fetchNui<void, Result<JobGrade[], never>>(NuiEvent.AdminGetJobGrades).then(result => {
            if (isOk(result)) {
                setJobGrades(result.ok);
            }
        });
    }, []);

    return jobGrades;
};

export const useHasJobPermission = (job: JobType, permission: JobPermission): boolean => {
    const player = usePlayer();
    const grades = useRepository(RepositoryType.JobGrade);

    if (!player || !grades) {
        return false;
    }

    if (player.job.id !== job) {
        return false;
    }

    const playerGradeId = Number(player.job.grade);

    const playerGrade = Object.values(grades).find(grade => {
        return grade.jobId === job && grade.id === playerGradeId;
    });

    if (!playerGrade) {
        return false;
    }

    if (playerGrade.owner) {
        return true;
    }

    return playerGrade.permissions.includes(permission);
};
