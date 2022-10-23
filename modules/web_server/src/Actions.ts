import { del, post } from "./utils/URLTools";

export class Actions {
    createNewWorkflow(listenerId: number): void {
        post(`/add_new_workflow/${listenerId}`, (request) => {
            console.log(request.response);
        });
    }

    deleteWorkflow(workflowId: number): void {
        del(`/delete_workflow/${workflowId}`, (request) => {
            console.log(request.response);
        });
    }

    moveRoutine(workflowId: number, routineId: number, index: number): void {
        post("/move_routine", (request) => {
            console.log(request.response);
        }, { workflow_id: workflowId, routine_id: routineId, index: index }, "JSON");
    }

    stopPropagation(className: string): void {
        const elements = document.getElementsByClassName(className);
        for (let i = 0; i <= elements.length; i++) {
            if (elements[i]) {
                elements[i].addEventListener("click", (evt) => {
                    evt.stopPropagation();
                });
            }
        }
    }
}
