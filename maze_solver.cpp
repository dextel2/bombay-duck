// maze_solver.cpp
// Generate a random maze (grid) using recursive backtracker, then solve with BFS.
// Build: g++ -std=c++17 maze_solver.cpp -o maze_solver
// Run: ./maze_solver 21 31
// Note: dimensions should be odd numbers for proper maze corridors.

#include <bits/stdc++.h>
using namespace std;

struct Cell { int r, c; };

int dr[4] = {-2, 2, 0, 0};
int dc[4] = {0, 0, -2, 2};

bool inBounds(int r, int c, int R, int C) {
    return r > 0 && r < R-1 && c > 0 && c < C-1;
}

void carveMaze(vector<string>& grid, int R, int C) {
    srand((unsigned)time(nullptr));
    vector<Cell> stack;
    int sr = 1, sc = 1;
    grid[sr][sc] = ' ';
    stack.push_back({sr, sc});
    while (!stack.empty()) {
        Cell cur = stack.back();
        vector<int> dirs = {0,1,2,3};
        random_shuffle(dirs.begin(), dirs.end());
        bool carved = false;
        for (int d : dirs) {
            int nr = cur.r + dr[d];
            int nc = cur.c + dc[d];
            if (inBounds(nr, nc, R, C) && grid[nr][nc] == '#') {
                // remove wall between
                grid[cur.r + dr[d]/2][cur.c + dc[d]/2] = ' ';
                grid[nr][nc] = ' ';
                stack.push_back({nr,nc});
                carved = true;
                break;
            }
        }
        if (!carved) stack.pop_back();
    }
}

vector<Cell> bfsSolve(const vector<string>& grid, int R, int C, Cell start, Cell goal) {
    vector<vector<bool>> vis(R, vector<bool>(C,false));
    vector<vector<Cell>> parent(R, vector<Cell>(C, {-1,-1}));
    queue<Cell>q;
    q.push(start); vis[start.r][start.c]=true;
    int fr[4]={-1,1,0,0}, fc[4]={0,0,-1,1};
    while(!q.empty()) {
        Cell cur=q.front(); q.pop();
        if (cur.r==goal.r && cur.c==goal.c) break;
        for(int i=0;i<4;i++) {
            int nr=cur.r+fr[i], nc=cur.c+fc[i];
            if (nr>=0 && nr<R && nc>=0 && nc<C && !vis[nr][nc] && grid[nr][nc]==' ') {
                vis[nr][nc]=true;
                parent[nr][nc]=cur;
                q.push({nr,nc});
            }
        }
    }
    // reconstruct
    vector<Cell> path;
    if (!vis[goal.r][goal.c]) return path;
    for (Cell cur = goal; cur.r!=-1; cur = parent[cur.r][cur.c]) path.push_back(cur);
    reverse(path.begin(), path.end());
    return path;
}

int main(int argc, char** argv) {
    int R=21, C=31;
    if (argc>=3) { R = max(5, atoi(argv[1])); C = max(5, atoi(argv[2])); }
    if (R%2==0) R++; if (C%2==0) C++;
    vector<string> grid(R, string(C, '#'));
    carveMaze(grid, R, C);
    Cell start = {1,1}, goal = {R-2, C-2};
    // mark entrance and exit
    grid[start.r][start.c] = 'S';
    grid[goal.r][goal.c] = 'G';

    // Solve
    grid[start.r][start.c] = ' ';
    grid[goal.r][goal.c] = ' ';
    auto path = bfsSolve(grid, R, C, start, goal);
    for (auto &p : path) grid[p.r][p.c] = '*';
    // restore markers
    grid[start.r][start.c] = 'S';
    grid[goal.r][goal.c] = 'G';

    // Print maze
    for (int r=0;r<R;r++) {
        cout << grid[r] << "\n";
    }
    cout << "\nSolution length: " << path.size() << "\n";
    return 0;
}
