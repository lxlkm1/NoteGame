// 室外场景配置
(function (root) {
  root.MAPS = root.MAPS || {};
  root.MAPS.outside = {
    name: '图书馆前庭',
    map: [
      "#######################################",
      "#FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF#",
      "#FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF#",
      "#FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF#",
      "#FFFFFFFFFFFFFFFFFFiiFFFFFFFFFFFFFFFFF#",
      "#ppppppppppppppppppppppppppppppppppppp#",
      "#ppppppppppppppppppppppppppppppppppppp#",
      "#ppppppppppppppppppppppppppppppppppppp#",
      "#gggggggggggggggpppppppggggggggggggggg#",
      "#gggggggggggggggpppppppggggggggggggggg#",
      "#ggggtggggggglggpppppppgglgggggggtgggg#",
      "#gggggggggggggggpppppppggggggggggggggg#",
      "#gggggggggggggggpppppppggggggggggggggg#",
      "#ggggggbggggggggpppppppggggggggbgggggg#",
      "#gggsssggssssgggpppppppgggssssggsssggg#",
      "#gggsssggssssgggpppppppgggssssggsssggg#",
      "#ggggggggtggggggpppppppggggggtgggggggg#",
      "#gggggggggggggggpppppppggggggggggggggg#",
      "#gggggggggggggggpppppppggggggggggggggg#",
      "#gggggggggggggggpppppppggggggggggggggg#",
      "#gggsssggssssgggpppppppgggssssggsssggg#",
      "#gggsssggssssgggpppppppgggssssggsssggg#",
      "#gggggggggggglggpppppppgglgggggggggggg#",
      "#ggggtggggggggggpppppppggggggggggtgggg#",
      "#gggggggggggggggpppppppggggggggggggggg#",
      "#ggggggbggggggggpppppppggggggggbgggggg#",
      "#gggsssggssssgggpppppppgggssssggsssggg#",
      "#gggsssggssssgggpppppppgggssssggsssggg#",
      "#gggggggggggggggpppppppggggggggggggggg#",
      "#######################################",
    ],
    entry: { col: 19, row: 6 },
    mimiSites: {
      left: { spawn: { col: 13, row: 16 }, hide: { col: 13, row: 15 } },
      right: { spawn: { col: 25, row: 16 }, hide: { col: 25, row: 15 } },
    },
  };
  if (typeof module !== 'undefined') module.exports = root.MAPS.outside;
})(typeof window !== 'undefined' ? window : globalThis);
