#include <stdio.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>

#include <errno.h>
#include <syscall.h>
#include <unistd.h>

#include <unistd.h>
#include <sys/user.h>
#include <sys/wait.h>
#include <sys/ptrace.h>
#include <sys/types.h>
#include <sys/reg.h>


#define FATAL(...) \
    do { \
        fprintf(stderr, "strace: " __VA_ARGS__); \
        fputc('\n', stderr); \
        exit(EXIT_FAILURE); \
    } while (0)

// int allowedSyscalls[]={0,1,2,3,4,5,6,7,8,9,10};
int disallowedSyscalls[]={262};
int disallowedCount = sizeof(disallowedSyscalls)/sizeof(disallowedSyscalls[0]);
int isdisAllowedSystemCalls(int syscall) {
    // for (int i = 0; i < allowedCount; i++) {
    //     if (syscall == allowedSyscalls[i]) {
    //         return 1; // System call thuộc mảng allowedSyscalls
    //     }
    // }

    for (int i = 0; i < disallowedCount; i++) {
        if (syscall == disallowedSyscalls[i]) {
            return 1; // System call thuộc mảng disallowedSyscalls
        }
    }
    return 0; // System call không thuộc cả hai mảng
}

int main(int argc, char *argv[])
{
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <program to trace>\n", argv[0]);
        exit(EXIT_FAILURE);
    }

    char *program_to_trace = argv[1];

    pid_t child;
    long orig_rax;
    child = fork();

    if (child == 0) {
        ptrace(PTRACE_TRACEME, 0, NULL, NULL);
        execl(program_to_trace, program_to_trace, NULL);
        perror("execl"); // In case execl fails
        exit(EXIT_FAILURE); // Ensure the child exits if execl fails
    }

    waitpid(child, 0, 0); // sync with exec
    ptrace(PTRACE_SETOPTIONS, child, 0, PTRACE_O_EXITKILL);

    for (;;) {
        /* Enter next system call */
        if (ptrace(PTRACE_SYSCALL, child, 0, 0) == -1)
            FATAL("%s", strerror(errno));
        if (waitpid(child, 0, 0) == -1)
            FATAL("%s", strerror(errno));

        /* Gather system call arguments */
        struct user_regs_struct regs;
        if (ptrace(PTRACE_GETREGS, child, 0, &regs) == -1)
            FATAL("%s", strerror(errno));
        long syscall = regs.orig_rax;

        /* Print a representation of the system call */
        /*
        fprintf(stderr, "%ld(%ld, %ld, %ld, %ld, %ld, %ld)",
                syscall,
                (long)regs.rdi, (long)regs.rsi, (long)regs.rdx,
                (long)regs.r10, (long)regs.r8,  (long)regs.r9);
        */
        if (isdisAllowedSystemCalls(syscall) == 1) {
            ptrace(PTRACE_KILL, child, NULL, NULL); // Gửi tín hiệu SIGKILL để kết thúc tiến trình con
            waitpid(child, 0, 0); // Đợi tiến trình con kết thúc (hoặc xử lý tiếp theo)
            // printf("Tiến trình con đã bị kết thúc.\n");
            break;
        } else {
            /* Run system call and stop on exit */
            if (ptrace(PTRACE_SYSCALL, child, 0, 0) == -1)
                FATAL("%s", strerror(errno));
            if (waitpid(child, 0, 0) == -1)
                FATAL("%s", strerror(errno));

            /* Get system call result */
            if (ptrace(PTRACE_GETREGS, child, 0, &regs) == -1) {
                // fputs(" = ?\n", stderr);
                if (errno == ESRCH)
                    exit(regs.rdi); // system call was _exit(2) or similar
                FATAL("%s", strerror(errno));
            }

            /* Print system call result */
            // fprintf(stderr, " = %ld\n", (long)regs.rax);
        }
    }
    // ptrace(PTRACE_CONT, child, NULL, NULL);
    return 0;
}